import random
import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def generer_code_alphanumerique():
    """Code court type CX7K29A1, facile à dicter au téléphone ou à un guichet."""
    alphabet = string.ascii_uppercase.replace('O', '').replace('I', '') + string.digits
    return 'CX' + ''.join(secrets.choice(alphabet) for _ in range(6))


def generer_qr_token():
    return secrets.token_hex(16)


DUREE_EXPIRATION_RESERVATION = timedelta(minutes=30)


class Reservation(models.Model):
    CANAL_EN_LIGNE = 'en_ligne'
    CANAL_GUICHET = 'guichet'
    CANAL_CHOICES = [(CANAL_EN_LIGNE, 'En ligne'), (CANAL_GUICHET, 'Guichet')]

    STATUT_EN_ATTENTE = 'en_attente_paiement'
    STATUT_CONFIRMEE = 'confirmee'
    STATUT_ANNULEE = 'annulee'
    STATUT_EXPIREE = 'expiree'
    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE, 'En attente de paiement'),
        (STATUT_CONFIRMEE, 'Confirmée'),
        (STATUT_ANNULEE, 'Annulée'),
        (STATUT_EXPIREE, 'Expirée'),
    ]

    code_alphanumerique = models.CharField(max_length=10, unique=True, editable=False)
    qr_token = models.CharField(max_length=32, blank=True, editable=False)

    voyage = models.ForeignKey('catalogue.Voyage', on_delete=models.PROTECT, related_name='reservations')
    tarif = models.ForeignKey('catalogue.Tarif', on_delete=models.PROTECT)

    client = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='reservations')
    agent_guichet = models.ForeignKey('accounts.Agent', null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name='ventes')

    canal = models.CharField(max_length=10, choices=CANAL_CHOICES)
    statut = models.CharField(max_length=25, choices=STATUT_CHOICES, default=STATUT_EN_ATTENTE)
    montant_total = models.DecimalField(max_digits=9, decimal_places=0, default=0)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField(null=True, blank=True)
    embarque = models.BooleanField(default=False)
    date_embarquement = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.code_alphanumerique} - {self.get_statut_display()}"

    def save(self, *args, **kwargs):
        if not self.code_alphanumerique:
            self.code_alphanumerique = self._code_unique()
        # Une réservation en ligne non payée immédiatement expire après un délai,
        # le temps de libérer les sièges pour d'autres clients.
        if self.canal == self.CANAL_EN_LIGNE and self.statut == self.STATUT_EN_ATTENTE and not self.date_expiration:
            self.date_expiration = timezone.now() + DUREE_EXPIRATION_RESERVATION
        super().save(*args, **kwargs)

    @staticmethod
    def _code_unique():
        code = generer_code_alphanumerique()
        while Reservation.objects.filter(code_alphanumerique=code).exists():
            code = generer_code_alphanumerique()
        return code

    def confirmer(self):
        """Passage au statut confirmé : génère le QR, valable pour scan à l'embarquement."""
        self.statut = self.STATUT_CONFIRMEE
        self.qr_token = generer_qr_token()
        self.date_expiration = None
        self.save(update_fields=['statut', 'qr_token', 'date_expiration'])

    @property
    def est_expiree(self):
        return (
            self.statut == self.STATUT_EN_ATTENTE
            and self.date_expiration is not None
            and timezone.now() > self.date_expiration
        )


class Passager(models.Model):
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name='passagers')
    nom = models.CharField(max_length=100)
    age = models.PositiveIntegerField(null=True, blank=True)
    siege = models.CharField(max_length=5)

    class Meta:
        unique_together = ('reservation', 'siege')

    def __str__(self):
        return f"{self.nom} - siège {self.siege}"
