from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from accounts.permissions import EstAgent
from .models import Reservation
from .serializers import ReservationSerializer
from .serializers_guichet import VenteGuichetSerializer, ScanTicketSerializer


class VenteGuichetView(generics.CreateAPIView):
    """POST /api/guichet/reservations/ — réservé aux agents."""
    serializer_class = VenteGuichetSerializer
    permission_classes = [permissions.IsAuthenticated, EstAgent]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)


class ScanTicketView(APIView):
    """
    POST /api/guichet/tickets/scan/
    Refuse si billet inconnu, non confirmé, ou déjà utilisé.
    """
    permission_classes = [permissions.IsAuthenticated, EstAgent]

    def post(self, request):
        entree = ScanTicketSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        filtre = {'code_alphanumerique': entree.validated_data['code']} if entree.validated_data.get('code') \
            else {'qr_token': entree.validated_data['qr_token']}

        try:
            reservation = Reservation.objects.get(**filtre)
        except Reservation.DoesNotExist:
            return Response({'valide': False, 'motif': 'Billet introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if reservation.statut != Reservation.STATUT_CONFIRMEE:
            return Response({'valide': False, 'motif': f"Billet non valide (statut: {reservation.get_statut_display()})."},
                             status=status.HTTP_400_BAD_REQUEST)
        if reservation.embarque:
            return Response({'valide': False, 'motif': "Ce billet a déjà été utilisé pour l'embarquement."},
                             status=status.HTTP_400_BAD_REQUEST)

        reservation.embarque = True
        reservation.date_embarquement = timezone.now()
        reservation.save(update_fields=['embarque', 'date_embarquement'])

        return Response({'valide': True, 'reservation': ReservationSerializer(reservation).data})