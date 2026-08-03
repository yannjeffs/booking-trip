from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Paiement
from .serializers import WebhookPaiementSerializer


class PaiementWebhookView(APIView):
    """
    POST /api/paiements/webhook/{provider}/
    Callback de l'agrégateur. C'est ICI, et seulement ici, que la réservation
    passe à 'confirmee'.

    ATTENTION sécurité : en prod, vérifier la signature/l'origine de la requête
    (secret partagé ou IP whitelistée) — sinon n'importe qui pourrait confirmer
    un paiement bidon.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, provider):
        entree = WebhookPaiementSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        data = entree.validated_data

        paiement = get_object_or_404(
            Paiement, reference_transaction=data['reference_transaction'], provider=provider
        )

        paiement.payload_brut = request.data
        if data['statut'] == 'reussi':
            paiement.statut = Paiement.STATUT_REUSSI
            paiement.date_confirmation = timezone.now()
            paiement.save()
            paiement.reservation.confirmer()
        else:
            paiement.statut = Paiement.STATUT_ECHOUE
            paiement.save()

        return Response({'recu': True}, status=status.HTTP_200_OK)