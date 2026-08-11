from rest_framework import serializers
from django.db import transaction
from catalogue.models import Voyage
from .models import Reservation, Passager
from .utils import get_sieges_disponibles
from .serializers import PassagerInputSerializer, ReservationCreateSerializer


class VenteGuichetSerializer(serializers.Serializer):
    """
    POST /api/guichet/reservations/
    Vente en agence : l'agent saisit les infos du client, choisit les sièges,
    encaisse en cash -> confirmation immédiate (QR généré tout de suite, prêt à imprimer).
    Supporte aussi l'aller-retour, sur le même principe que la vente en ligne.
    """
    client_nom = serializers.CharField(max_length=100)
    client_telephone = serializers.CharField(max_length=20)

    voyage = serializers.PrimaryKeyRelatedField(queryset=Voyage.objects.all())
    passagers = PassagerInputSerializer(many=True)

    type_billet = serializers.ChoiceField(choices=Reservation.TYPE_CHOICES, default=Reservation.TYPE_ALLER_SIMPLE)
    voyage_retour = serializers.PrimaryKeyRelatedField(queryset=Voyage.objects.all(), required=False)
    passagers_retour = PassagerInputSerializer(many=True, required=False)

    def validate(self, data):
        voyage = data['voyage']
        if not hasattr(voyage, 'tarif'):
            raise serializers.ValidationError("Aucun tarif n'est encore défini pour ce voyage.")
        ReservationCreateSerializer._valider_sieges(voyage, data['passagers'])

        est_aller_retour = data['type_billet'] == Reservation.TYPE_ALLER_RETOUR
        if est_aller_retour:
            if 'voyage_retour' not in data or 'passagers_retour' not in data:
                raise serializers.ValidationError("Un aller-retour nécessite voyage_retour et passagers_retour.")
            if not hasattr(data['voyage_retour'], 'tarif'):
                raise serializers.ValidationError("Aucun tarif n'est encore défini pour le voyage retour.")
            if len(data['passagers_retour']) != len(data['passagers']):
                raise serializers.ValidationError("Le nombre de passagers doit être identique à l'aller et au retour.")
            ReservationCreateSerializer._valider_sieges(data['voyage_retour'], data['passagers_retour'])

        return data

    @transaction.atomic
    def create(self, validated_data):
        from paiements.models import Paiement

        agent = self.context['request'].user.profil_agent
        voyage = validated_data['voyage']
        est_aller_retour = validated_data['type_billet'] == Reservation.TYPE_ALLER_RETOUR

        montant_aller = sum(voyage.tarif.prix_pour_age(p.get('age')) for p in validated_data['passagers'])
        montant_retour = 0
        if est_aller_retour:
            voyage_retour = validated_data['voyage_retour']
            montant_retour = sum(voyage_retour.tarif.prix_pour_age(p.get('age')) for p in validated_data['passagers_retour'])

        aller = Reservation.objects.create(
            voyage=voyage,
            agent_guichet=agent,
            canal=Reservation.CANAL_GUICHET,
            statut=Reservation.STATUT_EN_ATTENTE,
            type_billet=validated_data['type_billet'],
            montant_total=montant_aller + montant_retour,
            client_nom_guichet=validated_data['client_nom'],
            client_telephone_guichet=validated_data['client_telephone'],
        )
        Passager.objects.bulk_create([
            Passager(reservation=aller, nom=p['nom'], age=p.get('age'), siege=p['siege'])
            for p in validated_data['passagers']
        ])
        Paiement.objects.create(
            reservation=aller, provider=Paiement.PROVIDER_ESPECES,
            montant=montant_aller + montant_retour, statut=Paiement.STATUT_REUSSI,
        )

        if est_aller_retour:
            retour = Reservation.objects.create(
                voyage=validated_data['voyage_retour'],
                reservation_aller=aller,
                agent_guichet=agent,
                canal=Reservation.CANAL_GUICHET,
                statut=Reservation.STATUT_EN_ATTENTE,
                type_billet=Reservation.TYPE_ALLER_RETOUR,
                montant_total=montant_retour,
                client_nom_guichet=validated_data['client_nom'],
                client_telephone_guichet=validated_data['client_telephone'],
            )
            Passager.objects.bulk_create([
                Passager(reservation=retour, nom=p['nom'], age=p.get('age'), siege=p['siege'])
                for p in validated_data['passagers_retour']
            ])

        aller.confirmer()  # cash déjà en main -> confirmation immédiate + QR (cascade au retour lié)
        return aller


class ScanTicketSerializer(serializers.Serializer):
    """POST /api/guichet/tickets/scan/ — accepte un code alphanumérique OU un qr_token."""
    code = serializers.CharField(required=False, allow_blank=True)
    qr_token = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('code') and not data.get('qr_token'):
            raise serializers.ValidationError("Fournir 'code' ou 'qr_token'.")
        return data