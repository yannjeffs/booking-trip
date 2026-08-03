from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """
    Utilisateur custom : sert de base aux 3 rôles (client, agent, admin).
    Django gère déjà is_staff/is_superuser pour l'admin.
    """
    ROLE_CLIENT = 'client'
    ROLE_AGENT = 'agent'
    ROLE_ADMIN = 'admin'
    ROLES = [
        (ROLE_CLIENT, 'Client'),
        (ROLE_AGENT, 'Agent guichet'),
        (ROLE_ADMIN, 'Administrateur'),
    ]

    role = models.CharField(max_length=10, choices=ROLES, default=ROLE_CLIENT)
    telephone = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"


class Agent(models.Model):
    """Profil complémentaire pour les agents de guichet (agence physique)."""
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, related_name='profil_agent')
    agence = models.CharField(max_length=100)
    matricule = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"Agent {self.matricule} - {self.agence}"
