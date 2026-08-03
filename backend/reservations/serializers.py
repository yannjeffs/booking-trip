from rest_framework import serializers
from django.db import transaction
from catalogue.models import Voyage, Tarif
from .models import Reservation, Passager
from .utils import get_sieges_disponibles


class PassagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passager
        fields = ['nom', 'age', 'siege']


class PassagerInputSerializer(serializers.Serializer):
    """Utilisé en entrée de création de réservation (pas de reservation_id encore)."""
    nom = serializers.CharField(max_length=100)
    age = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=120)
    siege = serializers.CharField(max_length=5)


class ReservationSerializer(serializers.ModelSerializer):
    """Lecture : détail complet d'une réservation/ticket."""
    passagers = PassagerSerializer(many=True, read_only=True)
    voyage_id = serializers.IntegerField(source='voyage.id', read_only=True)
    trajet = serializers.CharField(source='voyage.trajet', read_only=True)
    date_heure_depart = serializers.DateTimeField(source='voyage.date_heure_depart', read_only=True)
    classe = serializers.CharField(source='tarif.classe.nom', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'code_alphanumerique', 'qr_token', 'statut', 'canal',
            'trajet', 'voyage_id', 'date_heure_depart', 'classe',
            'montant_total', 'date_creation', 'date_expiration',
            'embarque', 'date_embarquement', 'passagers',
        ]
        read_only_fields = fields


class ReservationCreateSerializer(serializers.Serializer):
    """
    Création côté public : réservation payée immédiatement (payer_maintenant=True,
    à finaliser via /reservations/{code}/payer/) ou réservation en attente
    (payer_maintenant=False -> juste un code alphanumérique, à payer plus tard).
    """
    voyage = serializers.PrimaryKeyRelatedField(queryset=Voyage.objects.all())
    tarif = serializers.PrimaryKeyRelatedField(queryset=Tarif.objects.all())
    passagers = PassagerInputSerializer(many=True)
    payer_maintenant = serializers.BooleanField(default=True)

    def validate(self, data):
        voyage = data['voyage']
        tarif = data['tarif']
        if tarif.voyage_id != voyage.id:
            raise serializers.ValidationError("Ce tarif ne correspond pas au voyage sélectionné.")

        sieges_demandes = [p['siege'] for p in data['passagers']]
        if len(sieges_demandes) != len(set(sieges_demandes)):
            raise serializers.ValidationError("Deux passagers ne peuvent pas partager le même siège.")

        dispo = set(get_sieges_disponibles(voyage))
        indisponibles = [s for s in sieges_demandes if s not in dispo]
        if indisponibles:
            raise serializers.ValidationError(f"Sièges déjà pris ou invalides : {', '.join(indisponibles)}")

        return data

    @transaction.atomic
    def create(self, validated_data):
        voyage = validated_data['voyage']
        tarif = validated_data['tarif']
        passagers_data = validated_data['passagers']
        client = self.context['request'].user if self.context['request'].user.is_authenticated else None

        montant_total = sum(tarif.prix_pour_age(p.get('age')) for p in passagers_data)

        reservation = Reservation.objects.create(
            voyage=voyage,
            tarif=tarif,
            client=client,
            canal=Reservation.CANAL_EN_LIGNE,
            statut=Reservation.STATUT_EN_ATTENTE,
            montant_total=montant_total,
        )
        Passager.objects.bulk_create([
            Passager(reservation=reservation, nom=p['nom'], age=p.get('age'), siege=p['siege'])
            for p in passagers_data
        ])
        # payer_maintenant ne confirme pas ici : ça déclenche juste le paiement côté
        # /reservations/{code}/payer/ ensuite. Seul le webhook de paiement confirme.
        return reservation