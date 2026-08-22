import secrets

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from paiements import cinetpay
from paiements.models import Paiement
from paiements.serializers import PaiementInitierSerializer
from .models import Reservation, ProgrammeFidelite
from .serializers import ReservationCreateSerializer, ReservationSerializer


CANAL_CINETPAY_PAR_PROVIDER = {
    Paiement.PROVIDER_ORANGE: 'ORANGE_MONEY',
    Paiement.PROVIDER_MTN: 'MTN_MOBILE_MONEY',
    Paiement.PROVIDER_CARTE: 'CREDIT_CARD'
}


class ReservationCreateView(generics.CreateAPIView):
    """
    POST /api/reservations/
    Body: {voyage, passagers, payer_maintenant, type_billet, voyage_retour?, passagers_retour?, utiliser_credit_fidelite?}
    Fonctionne authentifié (client identifié) ou anonyme (achat/réservation invité).
    """
    serializer_class = ReservationCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)


class ReservationPayerView(APIView):
    """
    POST /api/reservations/{code}/payer/
    Initie un paiement Mobile Money/carte pour une réservation en attente.
    Pour un aller-retour, seul le code ALLER accepte le paiement — payer l'aller
    confirme les deux legs d'un coup (voir Reservation.confirmer).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, code):
        reservation = get_object_or_404(Reservation, code_alphanumerique=code)

        if reservation.type_billet == Reservation.TYPE_ALLER_RETOUR and reservation.reservation_aller_id is not None:
            code_aller = reservation.reservation_aller.code_alphanumerique
            return Response(
                {'detail': f"Ce billet retour se paie via le billet aller {code_aller}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reservation.statut != Reservation.STATUT_EN_ATTENTE:
            return Response({'detail': "Cette réservation n'est pas en attente de paiement."},
                             status=status.HTTP_400_BAD_REQUEST)
        if reservation.est_expiree:
            reservation.statut = Reservation.STATUT_EXPIREE
            reservation.save(update_fields=['statut'])
            return Response({'detail': 'Cette réservation a expiré. Merci de recommencer.'},
                             status=status.HTTP_400_BAD_REQUEST)

        entree = PaiementInitierSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        provider = entree.validated_data['provider']
        numero = entree.validated_data.get('numero_telephone', '')

        transaction_id = f"{reservation.code_alphanumerique}-{secrets.token_hex(3)}".upper()

        client = reservation.client
        if client:
            nom, prenom = client.last_name, client.first_name
        else:
            nom = reservation.client_nom_guichet or (reservation.passagers.first().nom if reservation.passagers.exists() else 'Client')
            prenom = reservation.client_prenom_guichet

        try:
            resultat = cinetpay.initier_paiement(
                transaction_id=transaction_id,
                montant=reservation.montant_total,
                description=f"Billet {reservation.code_alphanumerique} - {reservation.voyage.trajet}",
                nom=nom, prenom=prenom,
                telephone=numero or reservation.client_telephone_guichet,
                canal=CANAL_CINETPAY_PAR_PROVIDER.get(provider, 'ALL'),
            )
        except cinetpay.CinetPayError as erreur:
            return Response({'detail': f"Impossible d'initier le paiement : {erreur}"},
                             status=status.HTTP_502_BAD_GATEWAY)

        paiement = Paiement.objects.create(
            reservation=reservation, provider=provider, numero_telephone=numero,
            reference_transaction=transaction_id, montant=reservation.montant_total,
            statut=Paiement.STATUT_INITIE,
        )

        return Response({
            'paiement_id': paiement.id,
            'statut': 'initie',
            'payment_url': resultat['payment_url'],
            'detail': "Redirection vers la page de paiement sécurisée CinetPay.",
        }, status=status.HTTP_202_ACCEPTED)


class TicketLookupView(APIView):
    """
    GET /api/tickets/lookup/?code=CX7K29A1
    GET /api/tickets/lookup/?qr_token=...
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        qr_token = request.query_params.get('qr_token')
        if not code and not qr_token:
            return Response({'detail': 'Fournir "code" ou "qr_token".'}, status=status.HTTP_400_BAD_REQUEST)
        filtre = {'code_alphanumerique': code} if code else {'qr_token': qr_token}
        reservation = get_object_or_404(Reservation, **filtre)
        return Response(ReservationSerializer(reservation).data)


class MesReservationsView(generics.ListAPIView):
    """GET /api/reservations/mes-reservations/ (authentifié)"""
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reservation.objects.filter(client=self.request.user).select_related(
            'voyage', 'voyage__trajet', 'voyage__tarif', 'voyage__bus', 'voyage__bus__classe',
        ).prefetch_related('passagers', 'reservations_retour')


class MaFideliteView(generics.GenericAPIView):
    """GET /api/fidelite/moi/ — crédits de fidélité du client connecté."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .serializers_fidelite import ProgrammeFideliteSerializer
        from .models import ProgrammeFidelite
        programme, _ = ProgrammeFidelite.objects.get_or_create(utilisateur=request.user)
        return Response(ProgrammeFideliteSerializer(programme).data)