# catalogue/views_admin.py
from rest_framework import viewsets, permissions
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import EstAdmin
from .models import Destination, Classe, Bus, Trajet, Voyage, Tarif
from .serializers_admin import (
    DestinationAdminSerializer, ClasseAdminSerializer, BusAdminSerializer,
    TrajetAdminSerializer, VoyageAdminSerializer, TarifAdminSerializer,
)


class AdminBaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, EstAdmin]


class DestinationAdminViewSet(AdminBaseViewSet):
    queryset = Destination.objects.all()
    serializer_class = DestinationAdminSerializer


class ClasseAdminViewSet(AdminBaseViewSet):
    queryset = Classe.objects.all()
    serializer_class = ClasseAdminSerializer


class BusAdminViewSet(AdminBaseViewSet):
    queryset = Bus.objects.all()
    serializer_class = BusAdminSerializer


class TrajetAdminViewSet(AdminBaseViewSet):
    queryset = Trajet.objects.all()
    serializer_class = TrajetAdminSerializer


class VoyageAdminViewSet(AdminBaseViewSet):
    queryset = Voyage.objects.select_related('trajet', 'bus', 'bus__classe', 'tarif')
    serializer_class = VoyageAdminSerializer


class TarifAdminViewSet(AdminBaseViewSet):
    """Un seul tarif par voyage."""
    queryset = Tarif.objects.select_related('voyage')
    serializer_class = TarifAdminSerializer


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, EstAdmin]

    def get(self, request):
        from reservations.models import Reservation
        from paiements.models import Paiement

        aujourd_hui = timezone.now().date()
        reservations_confirmees = Reservation.objects.filter(statut=Reservation.STATUT_CONFIRMEE)

        stats = {
            'voyages_aujourd_hui': Voyage.objects.filter(date_heure_depart__date=aujourd_hui).count(),
            'reservations_confirmees_total': reservations_confirmees.count(),
            'chiffre_affaires_total': reservations_confirmees.aggregate(total=Sum('montant_total'))['total'] or 0,
            'ventes_par_canal': list(
                reservations_confirmees.values('canal').annotate(nombre=Count('id'), montant=Sum('montant_total'))
            ),
            'reservations_en_attente': Reservation.objects.filter(statut=Reservation.STATUT_EN_ATTENTE).count(),
            'paiements_echoues_7j': Paiement.objects.filter(
                statut=Paiement.STATUT_ECHOUE,
                date_creation__gte=timezone.now() - timezone.timedelta(days=7),
            ).count(),
        }
        return Response(stats)