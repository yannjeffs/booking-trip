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
SEUIL_FIDELITE = 5  # nombre de billets solo (à son propre nom) pour gagner un billet gratuit


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

    TYPE_ALLER_SIMPLE = 'aller_simple'
    TYPE_ALLER_RETOUR = 'aller_retour'
    TYPE_CHOICES = [(TYPE_ALLER_SIMPLE, 'Aller simple'), (TYPE_ALLER_RETOUR, 'Aller-retour')]

    code_alphanumerique = models.CharField(max_length=10, unique=True, editable=False)
    qr_token = models.CharField(max_length=32, blank=True, editable=False)

    voyage = models.ForeignKey('catalogue.Voyage', on_delete=models.PROTECT, related_name='reservations')

    # Un aller-retour est modélisé comme DEUX Reservation (une par trajet/bus/date,
    # donc deux billets/QR distincts à scanner à l'embarquement) liées entre elles :
    # la réservation retour pointe vers sa réservation aller via ce champ.
    # reservation_aller = None  -> c'est la réservation "aller" (ou un aller simple).
    # reservation_aller = <x>   -> c'est la réservation "retour" de x.
    type_billet = models.CharField(max_length=15, choices=TYPE_CHOICES, default=TYPE_ALLER_SIMPLE)
    reservation_aller = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE, related_name='reservations_retour'
    )

    client = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='reservations')
    agent_guichet = models.ForeignKey('accounts.Agent', null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name='ventes')

    # Renseignés par l'agent au guichet quand le client n'a pas de compte (achat anonyme).
    client_nom_guichet = models.CharField(max_length=100, blank=True)
    client_prenom_guichet = models.CharField(max_length=100, blank=True)
    client_telephone_guichet = models.CharField(max_length=20, blank=True)

    canal = models.CharField(max_length=10, choices=CANAL_CHOICES)
    statut = models.CharField(max_length=25, choices=STATUT_CHOICES, default=STATUT_EN_ATTENTE)
    montant_total = models.DecimalField(max_digits=9, decimal_places=0, default=0)

    # Marque un billet offert par le programme de fidélité (gratuit, ne recompte pas pour la fidélité).
    est_recompense_fidelite = models.BooleanField(default=False)

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
        if self.canal == self.CANAL_EN_LIGNE and self.statut == self.STATUT_EN_ATTENTE and not self.date_expiration:
            self.date_expiration = timezone.now() + DUREE_EXPIRATION_RESERVATION
        if self.statut == self.STATUT_EN_ATTENTE and not self.date_expiration:
            self.date_expiration = timezone.now() + DUREE_EXPIRATION_RESERVATION
        super().save(*args, **kwargs)

    @staticmethod
    def _code_unique():
        code = generer_code_alphanumerique()
        while Reservation.objects.filter(code_alphanumerique=code).exists():
            code = generer_code_alphanumerique()
        return code

    def confirmer(self):
        """
        Passage au statut confirmé : génère le QR, valable pour scan à l'embarquement.
        Pour un aller-retour, confirmer la réservation "aller" confirme aussi
        automatiquement sa réservation "retour" liée (paiement unique pour les deux legs).
        """
        self.statut = self.STATUT_CONFIRMEE
        self.qr_token = generer_qr_token()
        self.date_expiration = None
        self.save(update_fields=['statut', 'qr_token', 'date_expiration'])

        self._appliquer_fidelite()

        if self.type_billet == self.TYPE_ALLER_RETOUR and self.reservation_aller_id is None:
            for retour in self.reservations_retour.filter(statut=self.STATUT_EN_ATTENTE):
                retour.confirmer()

    def _appliquer_fidelite(self):
        """
        Compte ce billet pour le programme de fidélité s'il est solo et au nom du
        client connecté. Ne compte qu'une fois par aller-retour (sur la réservation
        "aller", pas sur son leg retour), et jamais pour un billet déjà offert.
        """
        if self.est_recompense_fidelite or not self.client_id:
            return
        if self.type_billet == self.TYPE_ALLER_RETOUR and self.reservation_aller_id is not None:
            return

        passagers = list(self.passagers.all())
        nom_client = (self.client.get_full_name() or self.client.username).strip().lower()
        solo_et_nominatif = len(passagers) == 1 and passagers[0].nom.strip().lower() == nom_client

        if not solo_et_nominatif:
            return

        programme, _ = ProgrammeFidelite.objects.get_or_create(utilisateur=self.client)
        programme.enregistrer_achat(self.type_billet)

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


class ProgrammeFidelite(models.Model):
    """
    Compteurs de fidélité par client : un billet solo (un seul passager, à son propre
    nom) compte pour son type (aller simple ou aller-retour). Tous les 5 billets
    valides d'un type, le client gagne un crédit gratuit du même type.
    """
    utilisateur = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fidelite')
    nb_aller_simple_valides = models.PositiveIntegerField(default=0)
    nb_aller_retour_valides = models.PositiveIntegerField(default=0)
    credits_aller_simple = models.PositiveIntegerField(default=0)
    credits_aller_retour = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Fidélité {self.utilisateur} : {self.credits_aller_simple} AS / {self.credits_aller_retour} AR"

    def enregistrer_achat(self, type_billet):
        if type_billet == Reservation.TYPE_ALLER_SIMPLE:
            self.nb_aller_simple_valides += 1
            if self.nb_aller_simple_valides % SEUIL_FIDELITE == 0:
                self.credits_aller_simple += 1
        else:
            self.nb_aller_retour_valides += 1
            if self.nb_aller_retour_valides % SEUIL_FIDELITE == 0:
                self.credits_aller_retour += 1
        self.save()

    def credit_disponible(self, type_billet):
        return self.credits_aller_simple if type_billet == Reservation.TYPE_ALLER_SIMPLE else self.credits_aller_retour

    def consommer_credit(self, type_billet):
        if type_billet == Reservation.TYPE_ALLER_SIMPLE:
            if self.credits_aller_simple < 1:
                return False
            self.credits_aller_simple -= 1
        else:
            if self.credits_aller_retour < 1:
                return False
            self.credits_aller_retour -= 1
        self.save()
        return True