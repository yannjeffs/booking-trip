from django.urls import path
from .views import PaiementWebhookView

urlpatterns = [
    path('paiements/webhook/<str:provider>/', PaiementWebhookView.as_view(), name='paiement-webhook'),
]