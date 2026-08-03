from django.contrib import admin
from .models import Destination, Classe, Bus, Trajet, Voyage, Tarif


class TarifInline(admin.TabularInline):
    model = Tarif
    extra = 1


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = ('ville', 'region')
    search_fields = ('ville',)


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ('nom', 'ordre_affichage')


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ('immatriculation', 'capacite', 'actif')
    list_filter = ('actif',)


@admin.register(Trajet)
class TrajetAdmin(admin.ModelAdmin):
    list_display = ('depart', 'arrivee', 'duree_estimee', 'distance_km')


@admin.register(Voyage)
class VoyageAdmin(admin.ModelAdmin):
    list_display = ('trajet', 'bus', 'date_heure_depart', 'statut')
    list_filter = ('statut', 'trajet')
    inlines = [TarifInline]
