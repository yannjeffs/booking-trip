from django.urls import path
from .views import ReservationCreateView, ReservationPayerView, TicketLookupView, MesReservationsView
from .views_guichet import VenteGuichetView, ScanTicketView

urlpatterns = [
    path('reservations/', ReservationCreateView.as_view(), name='reservation-create'),
    path('reservations/mes-reservations/', MesReservationsView.as_view(), name='mes-reservations'),
    path('reservations/<str:code>/payer/', ReservationPayerView.as_view(), name='reservation-payer'),
    path('tickets/lookup/', TicketLookupView.as_view(), name='ticket-lookup'),

    path('guichet/reservations/', VenteGuichetView.as_view(), name='guichet-vente'),
    path('guichet/tickets/scan/', ScanTicketView.as_view(), name='guichet-scan'),
]