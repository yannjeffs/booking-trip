from rest_framework import serializers
from .models import Destination, Classe, Bus, Trajet, Voyage, Tarif, HoraireRecurrent


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
        fields = ['id', 'immatriculation', 'capacite', 'plan_sieges', 'classe', 'actif']


class TrajetAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trajet
        fields = ['id', 'depart', 'arrivee', 'duree_estimee', 'distance_km']


class TarifAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarif
        fields = ['id', 'voyage', 'prix_adulte', 'prix_enfant']


class VoyageAdminSerializer(serializers.ModelSerializer):
    """Création ponctuelle d'un voyage isolé (en plus des horaires récurrents)."""
    tarif = TarifAdminSerializer(read_only=True)
    classe_id = serializers.IntegerField(source='bus.classe_id', read_only=True)
    horaire_recurrent = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Voyage
        fields = ['id', 'trajet', 'bus', 'classe_id', 'date_heure_depart', 'statut', 'tarif', 'horaire_recurrent']

    def validate(self, data):
        bus = data.get('bus', getattr(self.instance, 'bus', None))
        trajet = data.get('trajet', getattr(self.instance, 'trajet', None))
        debut = data.get('date_heure_depart', getattr(self.instance, 'date_heure_depart', None))
        if bus and trajet and debut:
            fin = debut + trajet.duree_estimee
            conflits = Voyage.objects.filter(bus=bus).exclude(statut='annule')
            if self.instance:
                conflits = conflits.exclude(pk=self.instance.pk)
            for v in conflits:
                v_fin = v.date_heure_depart + v.trajet.duree_estimee
                if debut < v_fin and v.date_heure_depart < fin:
                    raise serializers.ValidationError(
                        f"Le bus {bus.immatriculation} est déjà programmé sur un autre trajet "
                        f"qui chevauche ce créneau ({v.trajet}, départ {v.date_heure_depart:%d/%m %H:%M})."
                    )
        return data


class HoraireRecurrentAdminSerializer(serializers.ModelSerializer):
    """
    Un départ récurrent (ex: 'Yaoundé -> Douala, VIP, 09h00, 12000 FCFA/adulte').
    La création matérialise immédiatement les voyages sur l'horizon glissant ; modifier
    heure_depart régénère les occurrences futures non réservées ; désactiver annule les
    occurrences futures non réservées et conserve les autres (déjà vendues) inchangées.
    """
    nb_voyages_a_venir = serializers.SerializerMethodField()

    class Meta:
        model = HoraireRecurrent
        fields = ['id', 'trajet', 'classe', 'heure_depart', 'prix_adulte', 'prix_enfant', 'actif', 'nb_voyages_a_venir']

    def get_nb_voyages_a_venir(self, horaire):
        from django.utils import timezone
        return horaire.voyages.filter(date_heure_depart__gte=timezone.now()).count()