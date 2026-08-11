from rest_framework import serializers
from .models import Destination, Classe, Bus, Trajet, Voyage, Tarif


class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = ['id', 'ville', 'region']


class ClasseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classe
        fields = ['id', 'nom', 'description']


class TarifSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarif
        fields = ['id', 'prix_adulte', 'prix_enfant']


class TrajetSerializer(serializers.ModelSerializer):
    depart = DestinationSerializer(read_only=True)
    arrivee = DestinationSerializer(read_only=True)

    class Meta:
        model = Trajet
        fields = ['id', 'depart', 'arrivee', 'duree_estimee', 'distance_km']


class VoyageListSerializer(serializers.ModelSerializer):
    """Utilisé pour les résultats de recherche : léger, avec tarif et places restantes."""
    trajet = TrajetSerializer(read_only=True)
    tarif = TarifSerializer(read_only=True)
    classe = ClasseSerializer(read_only=True)
    places_disponibles = serializers.SerializerMethodField()

    class Meta:
        model = Voyage
        fields = ['id', 'trajet', 'bus', 'classe', 'date_heure_depart', 'statut', 'tarif', 'places_disponibles']

    def get_places_disponibles(self, voyage):
        from reservations.utils import get_sieges_disponibles
        return len(get_sieges_disponibles(voyage))


class SiegeSerializer(serializers.Serializer):
    """Représentation d'un siège pour le plan interactif (pas de modèle dédié)."""
    numero = serializers.CharField()
    statut = serializers.ChoiceField(choices=['libre', 'occupe'])