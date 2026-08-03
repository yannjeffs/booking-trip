from rest_framework import serializers
from .models import Paiement


class PaiementInitierSerializer(serializers.Serializer):
    """Entrée pour POST /api/reservations/{code}/payer/"""
    provider = serializers.ChoiceField(choices=[Paiement.PROVIDER_ORANGE, Paiement.PROVIDER_MTN, Paiement.PROVIDER_CARTE])
    numero_telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)


class PaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paiement
        fields = ['id', 'provider', 'reference_transaction', 'montant', 'statut', 'date_creation', 'date_confirmation']
        read_only_fields = fields


class WebhookPaiementSerializer(serializers.Serializer):
    """
    Format générique attendu d'un agrégateur (à adapter selon Orange Money / MTN MoMo /
    CinetPay / Notchpay réellement choisi — la forme du payload varie par provider).
    """
    reference_transaction = serializers.CharField()
    statut = serializers.ChoiceField(choices=['reussi', 'echoue'])
    montant = serializers.DecimalField(max_digits=9, decimal_places=0, required=False)