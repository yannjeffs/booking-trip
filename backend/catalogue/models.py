from django.db import models


class Destination(models.Model):
    ville = models.CharField(max_length=80, unique=True)
    region = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ['ville']

    def __str__(self):
        return self.ville


class Classe(models.Model):
    """Classique, Confort, Premium, VIP — créées librement par l'admin."""
    nom = models.CharField(max_length=30, unique=True)
    description = models.TextField(blank=True)
    ordre_affichage = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['ordre_affichage']

    def __str__(self):
        return self.nom


class Bus(models.Model):
    immatriculation = models.CharField(max_length=20, unique=True)
    capacite = models.PositiveSmallIntegerField()
    # Plan de sièges : ex. {"rangees": 10, "colonnes": ["A","B","C","D"], "allee_apres": "B"}
    plan_sieges = models.JSONField()
    actif = models.BooleanField(default=True)

    def __str__(self):
        return self.immatriculation


class Trajet(models.Model):
    depart = models.ForeignKey(Destination, on_delete=models.PROTECT, related_name='trajets_depart')
    arrivee = models.ForeignKey(Destination, on_delete=models.PROTECT, related_name='trajets_arrivee')
    duree_estimee = models.DurationField()
    distance_km = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('depart', 'arrivee')

    def __str__(self):
        return f"{self.depart} → {self.arrivee}"


class Voyage(models.Model):
    """Un départ programmé : un trajet, un bus, une date/heure précise."""
    trajet = models.ForeignKey(Trajet, on_delete=models.PROTECT, related_name='voyages')
    bus = models.ForeignKey(Bus, on_delete=models.PROTECT, related_name='voyages')
    date_heure_depart = models.DateTimeField()
    statut = models.CharField(
        max_length=15,
        choices=[('planifie', 'Planifié'), ('en_cours', 'En cours'), ('termine', 'Terminé'), ('annule', 'Annulé')],
        default='planifie',
    )

    class Meta:
        ordering = ['date_heure_depart']

    def __str__(self):
        return f"{self.trajet} - {self.date_heure_depart:%d/%m/%Y %H:%M}"


class Tarif(models.Model):
    """Prix adulte/enfant pour une classe donnée, sur un voyage donné."""
    voyage = models.ForeignKey(Voyage, on_delete=models.CASCADE, related_name='tarifs')
    classe = models.ForeignKey(Classe, on_delete=models.PROTECT)
    prix_adulte = models.DecimalField(max_digits=8, decimal_places=0)
    prix_enfant = models.DecimalField(max_digits=8, decimal_places=0)  # ≤ 12 ans

    class Meta:
        unique_together = ('voyage', 'classe')

    def __str__(self):
        return f"{self.voyage} - {self.classe} : {self.prix_adulte} FCFA"

    def prix_pour_age(self, age):
        AGE_LIMITE_ENFANT = 12
        return self.prix_enfant if age is not None and age <= AGE_LIMITE_ENFANT else self.prix_adulte
