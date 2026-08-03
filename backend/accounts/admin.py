from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur, Agent


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display = ('username', 'telephone', 'role', 'is_staff')
    list_filter = ('role', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Infos plateforme', {'fields': ('role', 'telephone')}),
    )


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'agence', 'utilisateur')
