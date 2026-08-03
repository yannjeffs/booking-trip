from django.db import models


class Paiement(models.Model):
    PROVIDER_ORANGE = 'orange_money'
    PROVIDER_MTN = 'mtn_momo'
    PROVIDER_CARTE = 'carte_bancaire'
    PROVIDER_ESPECES = 'especes'  # vente guichet
    PROVIDER_CHOICES = [
        (PROVIDER_ORANGE, 'Orange Money'),
        (PROVIDER_MTN, 'MTN Mobile Money'),
        (PROVIDER_CARTE, 'Carte bancaire'),
        (PROVIDER_ESPECES, 'Espèces (guichet)'),
    ]

    STATUT_INITIE = 'initie'
    STATUT_REUSSI = 'reussi'
    STATUT_ECHOUE = 'echoue'
    STATUT_CHOICES = [
        (STATUT_INITIE, 'Initié'),
        (STATUT_REUSSI, 'Réussi'),
        (STATUT_ECHOUE, 'Échoué'),
    ]

    reservation = models.ForeignKey('reservations.Reservation', on_delete=models.PROTECT, related_name='paiements')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    reference_transaction = models.CharField(max_length=100, blank=True)  # id renvoyé par l'agrégateur
    numero_telephone = models.CharField(max_length=20, blank=True)
    montant = models.DecimalField(max_digits=9, decimal_places=0)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default=STATUT_INITIE)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_confirmation = models.DateTimeField(null=True, blank=True)
    payload_brut = models.JSONField(null=True, blank=True)  # réponse webhook complète, pour audit

    def __str__(self):
        return f"{self.reservation.code_alphanumerique} - {self.get_provider_display()} - {self.get_statut_display()}"
