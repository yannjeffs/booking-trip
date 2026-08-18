from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DestinationViewSet, ClasseViewSet, VoyageRechercheView, VoyagePlanSiegesView
from .views_admin import (
    DestinationAdminViewSet, ClasseAdminViewSet, BusAdminViewSet,
    TrajetAdminViewSet, VoyageAdminViewSet, TarifAdminViewSet,
    HoraireRecurrentAdminViewSet, GenererVoyagesView, DashboardStatsView,
)

router_public = DefaultRouter()
router_public.register('destinations', DestinationViewSet, basename='destination')
router_public.register('classes', ClasseViewSet, basename='classe')

router_admin = DefaultRouter()
router_admin.register('destinations', DestinationAdminViewSet, basename='admin-destination')
router_admin.register('classes', ClasseAdminViewSet, basename='admin-classe')
router_admin.register('bus', BusAdminViewSet, basename='admin-bus')
router_admin.register('trajets', TrajetAdminViewSet, basename='admin-trajet')
router_admin.register('voyages', VoyageAdminViewSet, basename='admin-voyage')
router_admin.register('tarifs', TarifAdminViewSet, basename='admin-tarif')
router_admin.register('horaires-recurrents', HoraireRecurrentAdminViewSet, basename='admin-horaire-recurrent')

urlpatterns = [
    path('voyages/', VoyageRechercheView.as_view(), name='voyage-recherche'),
    path('voyages/<int:pk>/sieges/', VoyagePlanSiegesView.as_view(), name='voyage-sieges'),
    path('', include(router_public.urls)),

    path('admin/dashboard/stats/', DashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('admin/horaires-recurrents/generer/', GenererVoyagesView.as_view(), name='admin-generer-voyages'),
    path('admin/', include(router_admin.urls)),
]