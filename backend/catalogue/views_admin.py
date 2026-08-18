from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.views import APIView

from accounts.permissions import EstAdmin
from .models import Destination, Classe, Bus, Trajet, Voyage, Tarif, HoraireRecurrent
from .generation import generer_voyages_horizon, regenerer_horaire, retirer_horaire
from .serializers_admin import (
    DestinationAdminSerializer, ClasseAdminSerializer, BusAdminSerializer,
    TrajetAdminSerializer, VoyageAdminSerializer, TarifAdminSerializer,
    HoraireRecurrentAdminSerializer,
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
    """Création ponctuelle d'un voyage isolé — en complément des horaires récurrents."""
    queryset = Voyage.objects.select_related('trajet', 'bus', 'bus__classe', 'tarif')
    serializer_class = VoyageAdminSerializer


class TarifAdminViewSet(AdminBaseViewSet):
    queryset = Tarif.objects.select_related('voyage')
    serializer_class = TarifAdminSerializer


class HoraireRecurrentAdminViewSet(AdminBaseViewSet):
    """
    CRUD des départs récurrents. Les effets de bord (matérialisation, régénération,
    annulation) sont déclenchés automatiquement autour des opérations standard DRF.
    """
    queryset = HoraireRecurrent.objects.select_related('trajet', 'classe')
    serializer_class = HoraireRecurrentAdminSerializer

    def perform_create(self, serializer):
        horaire = serializer.save()
        generer_voyages_horizon()

    def perform_update(self, serializer):
        ancien = self.get_object()
        heure_changee = 'heure_depart' in serializer.validated_data and serializer.validated_data['heure_depart'] != ancien.heure_depart
        horaire = serializer.save()
        if heure_changee:
            regenerer_horaire(horaire)
        else:
            generer_voyages_horizon()

    def destroy(self, request, *args, **kwargs):
        """DELETE = retrait logique (actif=False), pas une suppression en base — préserve
        l'historique des voyages déjà vendus qui référencent cet horaire."""
        horaire = self.get_object()
        retirer_horaire(horaire)
        return Response(status=status.HTTP_204_NO_CONTENT)


class GenererVoyagesView(APIView):
    """POST /api/admin/horaires-recurrents/generer/ — déclenche la génération manuellement."""
    permission_classes = [permissions.IsAuthenticated, EstAdmin]

    def post(self, request):
        horizon = int(request.data.get('horizon', 30))
        resultats = generer_voyages_horizon(horizon_jours=horizon)
        return Response({
            'crees': resultats['crees'],
            'deja_existants': resultats['deja_existants'],
            'classes_sans_bus': sorted(resultats['classes_sans_bus']),
        })


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