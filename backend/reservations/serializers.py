from rest_framework import serializers
from django.db import transaction
from catalogue.models import Voyage
from .models import Reservation, Passager, ProgrammeFidelite
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
    classe = serializers.CharField(source='voyage.bus.classe.nom', read_only=True)
    reservation_retour = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            'code_alphanumerique', 'qr_token', 'statut', 'canal', 'type_billet',
            'trajet', 'voyage_id', 'date_heure_depart', 'classe',
            'montant_total', 'est_recompense_fidelite', 'date_creation', 'date_expiration',
            'embarque', 'date_embarquement', 'passagers', 'reservation_retour',
        ]
        read_only_fields = fields

    def get_reservation_retour(self, reservation):
        if reservation.type_billet != Reservation.TYPE_ALLER_RETOUR or reservation.reservation_aller_id is not None:
            return None
        retour = reservation.reservations_retour.first()
        return ReservationSerializer(retour).data if retour else None


class ReservationCreateSerializer(serializers.Serializer):
    """
    Création côté public. Couvre :
    - achat immédiat ou réservation à payer plus tard (payer_maintenant, informatif
      côté frontend — dans les deux cas un code alphanumérique est délivré tout de suite) ;
    - aller simple ou aller-retour (type_billet + voyage_retour/passagers_retour) ;
    - utilisation d'un crédit de fidélité (billet offert, confirmation immédiate).
    """
    voyage = serializers.PrimaryKeyRelatedField(queryset=Voyage.objects.all())
    passagers = PassagerInputSerializer(many=True)
    payer_maintenant = serializers.BooleanField(default=True)

    type_billet = serializers.ChoiceField(choices=Reservation.TYPE_CHOICES, default=Reservation.TYPE_ALLER_SIMPLE)
    voyage_retour = serializers.PrimaryKeyRelatedField(queryset=Voyage.objects.all(), required=False)
    passagers_retour = PassagerInputSerializer(many=True, required=False)

    utiliser_credit_fidelite = serializers.BooleanField(default=False)

    def validate(self, data):
        voyage = data['voyage']
        if not hasattr(voyage, 'tarif'):
            raise serializers.ValidationError("Aucun tarif n'est encore défini pour ce voyage.")

        self._valider_sieges(voyage, data['passagers'])

        est_aller_retour = data['type_billet'] == Reservation.TYPE_ALLER_RETOUR
        if est_aller_retour:
            if 'voyage_retour' not in data or 'passagers_retour' not in data:
                raise serializers.ValidationError("Un aller-retour nécessite voyage_retour et passagers_retour.")
            if data['voyage_retour'].id == voyage.id:
                raise serializers.ValidationError("Le voyage retour doit être différent du voyage aller.")
            if not hasattr(data['voyage_retour'], 'tarif'):
                raise serializers.ValidationError("Aucun tarif n'est encore défini pour le voyage retour.")
            if len(data['passagers_retour']) != len(data['passagers']):
                raise serializers.ValidationError("Le nombre de passagers doit être identique à l'aller et au retour.")
            self._valider_sieges(data['voyage_retour'], data['passagers_retour'])

        if data['utiliser_credit_fidelite']:
            request = self.context['request']
            if not request.user.is_authenticated:
                raise serializers.ValidationError("Connectez-vous pour utiliser un crédit de fidélité.")
            passagers_a_verifier = data['passagers'] + (data['passagers_retour'] if est_aller_retour else [])
            nom_client = (request.user.get_full_name() or request.user.username).strip().lower()
            solo_et_nominatif = (
                len(data['passagers']) == 1
                and (not est_aller_retour or len(data['passagers_retour']) == 1)
                and all(p['nom'].strip().lower() == nom_client for p in passagers_a_verifier)
            )
            if not solo_et_nominatif:
                raise serializers.ValidationError(
                    "Le billet gratuit de fidélité doit être un billet solo, à votre propre nom."
                )
            programme, _ = ProgrammeFidelite.objects.get_or_create(utilisateur=request.user)
            if programme.credit_disponible(data['type_billet']) < 1:
                raise serializers.ValidationError("Vous n'avez pas de crédit de fidélité disponible pour ce type de billet.")

        return data

    @staticmethod
    def _valider_sieges(voyage, passagers):
        sieges_demandes = [p['siege'] for p in passagers]
        if len(sieges_demandes) != len(set(sieges_demandes)):
            raise serializers.ValidationError("Deux passagers ne peuvent pas partager le même siège.")
        dispo = set(get_sieges_disponibles(voyage))
        indisponibles = [s for s in sieges_demandes if s not in dispo]
        if indisponibles:
            raise serializers.ValidationError(f"Sièges déjà pris ou invalides : {', '.join(indisponibles)}")

    @transaction.atomic
    def create(self, validated_data):
        request = self.context['request']
        client = request.user if request.user.is_authenticated else None
        est_aller_retour = validated_data['type_billet'] == Reservation.TYPE_ALLER_RETOUR

        voyage = validated_data['voyage']
        montant_aller = sum(voyage.tarif.prix_pour_age(p.get('age')) for p in validated_data['passagers'])
        montant_retour = 0
        if est_aller_retour:
            voyage_retour = validated_data['voyage_retour']
            montant_retour = sum(voyage_retour.tarif.prix_pour_age(p.get('age')) for p in validated_data['passagers_retour'])

        gratuit = False
        if validated_data['utiliser_credit_fidelite']:
            programme, _ = ProgrammeFidelite.objects.get_or_create(utilisateur=client)
            gratuit = programme.consommer_credit(validated_data['type_billet'])

        aller = Reservation.objects.create(
            voyage=voyage,
            client=client,
            canal=Reservation.CANAL_EN_LIGNE,
            statut=Reservation.STATUT_EN_ATTENTE,
            type_billet=validated_data['type_billet'],
            montant_total=0 if gratuit else (montant_aller + montant_retour),
            est_recompense_fidelite=gratuit,
        )
        Passager.objects.bulk_create([
            Passager(reservation=aller, nom=p['nom'], age=p.get('age'), siege=p['siege'])
            for p in validated_data['passagers']
        ])

        if est_aller_retour:
            retour = Reservation.objects.create(
                voyage=validated_data['voyage_retour'],
                reservation_aller=aller,
                client=client,
                canal=Reservation.CANAL_EN_LIGNE,
                statut=Reservation.STATUT_EN_ATTENTE,
                type_billet=Reservation.TYPE_ALLER_RETOUR,
                montant_total=0 if gratuit else montant_retour,
                est_recompense_fidelite=gratuit,
            )
            Passager.objects.bulk_create([
                Passager(reservation=retour, nom=p['nom'], age=p.get('age'), siege=p['siege'])
                for p in validated_data['passagers_retour']
            ])

        if gratuit:
            aller.confirmer()  # confirme aussi la réservation retour liée (voir Reservation.confirmer)

        return aller