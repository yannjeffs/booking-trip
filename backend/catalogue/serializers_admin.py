from rest_framework import serializers
from .models import Destination, Classe, Bus, Trajet, Voyage, Tarif


class DestinationAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = ['id', 'ville', 'region']


class ClasseAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classe
        fields = ['id', 'nom', 'description', 'ordre_affichage']


class BusAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields = ['id', 'immatriculation', 'capacite', 'plan_sieges', 'actif']


class TrajetAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trajet
        fields = ['id', 'depart', 'arrivee', 'duree_estimee', 'distance_km']


class TarifAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarif
        fields = ['id', 'voyage', 'classe', 'prix_adulte', 'prix_enfant']


class VoyageAdminSerializer(serializers.ModelSerializer):
    tarifs = TarifAdminSerializer(many=True, read_only=True)

    class Meta:
        model = Voyage
        fields = ['id', 'trajet', 'bus', 'date_heure_depart', 'statut', 'tarifs']