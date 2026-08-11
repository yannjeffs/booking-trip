from rest_framework import serializers
from .models import ProgrammeFidelite


class ProgrammeFideliteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgrammeFidelite
        fields = ['nb_aller_simple_valides', 'nb_aller_retour_valides', 'credits_aller_simple', 'credits_aller_retour']
        read_only_fields = fields