from rest_framework import viewsets, generics, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Destination, Classe, Voyage
from .serializers import DestinationSerializer, ClasseSerializer, VoyageListSerializer, SiegeSerializer


class DestinationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    permission_classes = [permissions.AllowAny]


class ClasseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Classe.objects.all()
    serializer_class = ClasseSerializer
    permission_classes = [permissions.AllowAny]


class VoyageRechercheView(generics.ListAPIView):
    """
    GET /api/voyages/?depart=Yaoundé&arrivee=Douala&date=2026-08-05&classe=1
    Recherche de trajets disponibles - point d'entrée principal côté client.
    """
    serializer_class = VoyageListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Voyage.objects.select_related('trajet', 'trajet__depart', 'trajet__arrivee', 'bus', 'bus__classe', 'tarif') \
                            .filter(statut='planifie')
        depart = self.request.query_params.get('depart')
        arrivee = self.request.query_params.get('arrivee')
        date = self.request.query_params.get('date')
        classe = self.request.query_params.get('classe')

        if depart:
            qs = qs.filter(trajet__depart__ville__iexact=depart)
        if arrivee:
            qs = qs.filter(trajet__arrivee__ville__iexact=arrivee)
        if date:
            qs = qs.filter(date_heure_depart__date=date)
        if classe:
            qs = qs.filter(bus__classe_id=classe)
        return qs.distinct()


class VoyagePlanSiegesView(generics.GenericAPIView):
    """GET /api/voyages/{id}/sieges/ -> plan de sièges libre/occupé pour le voyage."""
    permission_classes = [permissions.AllowAny]
    serializer_class = SiegeSerializer

    def get(self, request, pk):
        from reservations.utils import plan_sieges_avec_statut
        voyage = get_object_or_404(Voyage, pk=pk)
        data = plan_sieges_avec_statut(voyage)
        return Response({'voyage_id': voyage.id, 'sieges': data})