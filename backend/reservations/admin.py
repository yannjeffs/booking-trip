from django.contrib import admin
from .models import Reservation, Passager


class PassagerInline(admin.TabularInline):
    model = Passager
    extra = 0


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('code_alphanumerique', 'voyage', 'canal', 'statut', 'montant_total', 'embarque')
    list_filter = ('statut', 'canal', 'embarque')
    search_fields = ('code_alphanumerique', 'qr_token')
    inlines = [PassagerInline]
