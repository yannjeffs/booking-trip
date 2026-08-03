from rest_framework import serializers
from django.db import transaction
from catalogue.models import Voyage, Tarif
from .models import Reservation, Passager
from .utils import get_sieges_disponibles
from .serializers import PassagerInputSerializer


class VenteGuichetSerializer(serializers.Serializer):
    """
    POST /api/guichet/reservations/
    Vente en agence : paiement cash déjà encaissé, donc confirmation immédiate.
    """
    voyage = serializers.PrimaryKeyRelatedField(queryset=Voyage.objects.all())
    tarif = serializers.PrimaryKeyRelatedField(queryset=Tarif.objects.all())
    passagers = PassagerInputSerializer(many=True)

    def validate(self, data):
        if data['tarif'].voyage_id != data['voyage'].id:
            raise serializers.ValidationError("Ce tarif ne correspond pas au voyage sélectionné.")
        sieges_demandes = [p['siege'] for p in data['passagers']]
        dispo = set(get_sieges_disponibles(data['voyage']))
        indisponibles = [s for s in sieges_demandes if s not in dispo]
        if indisponibles:
            raise serializers.ValidationError(f"Sièges déjà pris : {', '.join(indisponibles)}")
        return data

    @transaction.atomic
    def create(self, validated_data):
        from paiements.models import Paiement
        voyage, tarif = validated_data['voyage'], validated_data['tarif']
        passagers_data = validated_data['passagers']
        agent = self.context['request'].user.profil_agent

        montant_total = sum(tarif.prix_pour_age(p.get('age')) for p in passagers_data)

        reservation = Reservation.objects.create(
            voyage=voyage,
            tarif=tarif,
            agent_guichet=agent,
            canal=Reservation.CANAL_GUICHET,
            statut=Reservation.STATUT_EN_ATTENTE,
            montant_total=montant_total,
        )
        Passager.objects.bulk_create([
            Passager(reservation=reservation, nom=p['nom'], age=p.get('age'), siege=p['siege'])
            for p in passagers_data
        ])
        Paiement.objects.create(
            reservation=reservation,
            provider=Paiement.PROVIDER_ESPECES,
            montant=montant_total,
            statut=Paiement.STATUT_REUSSI,
        )
        reservation.confirmer()  # cash déjà en main -> confirmation immédiate + QR
        return reservation


class ScanTicketSerializer(serializers.Serializer):
    """POST /api/guichet/tickets/scan/ — accepte un code alphanumérique OU un qr_token."""
    code = serializers.CharField(required=False, allow_blank=True)
    qr_token = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('code') and not data.get('qr_token'):
            raise serializers.ValidationError("Fournir 'code' ou 'qr_token'.")
        return data