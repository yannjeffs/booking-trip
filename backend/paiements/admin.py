from django.contrib import admin
from .models import Paiement


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ('reservation', 'provider', 'montant', 'statut', 'date_creation')
    list_filter = ('provider', 'statut')
