from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import Paiement
from . import cinetpay


class CinetPayNotifyView(APIView):
    """
    POST et GET (les deux exigés par CinetPay) /api/paiements/cinetpay/notify/
    C'est ICI, et seulement ici, qu'une réservation passe à 'confirmee'.

    Sécurité : on ne fait JAMAIS confiance au contenu brut de cet appel (CinetPay le
    documente explicitement — risque de type man-in-the-middle). On ne lit que le
    cpm_trans_id reçu, puis on revérifie le VRAI statut auprès de l'API CinetPay
    (verifier_transaction) avant de mettre quoi que ce soit à jour.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        transaction_id = request.data.get('cpm_trans_id') or request.POST.get('cpm_trans_id')
        return self._traiter(transaction_id)

    def get(self, request):
        return self._traiter(request.GET.get('cpm_trans_id'))

    def _traiter(self, transaction_id):
        if not transaction_id:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        paiement = Paiement.objects.filter(reference_transaction=transaction_id).select_related('reservation').first()
        if not paiement:
            return Response(status=status.HTTP_200_OK)

        if paiement.statut == Paiement.STATUT_REUSSI:
            return Response(status=status.HTTP_200_OK)  # déjà traité, idempotent

        verification = cinetpay.verifier_transaction(transaction_id)
        paiement.payload_brut = verification
        statut_cinetpay = (verification.get('data') or {}).get('status')

        if statut_cinetpay == 'ACCEPTED':
            paiement.statut = Paiement.STATUT_REUSSI
            paiement.date_confirmation = timezone.now()
            paiement.save()
            paiement.reservation.confirmer()
        elif statut_cinetpay in ('REFUSED', 'CANCELLED'):
            paiement.statut = Paiement.STATUT_ECHOUE
            paiement.save()
        else:
            paiement.save(update_fields=['payload_brut'])

        return Response(status=status.HTTP_200_OK)