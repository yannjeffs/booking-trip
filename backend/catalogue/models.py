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
    # Un bus n'a qu'une seule classe (VIP, Premium, Classique ou Confort) — pas de mixité à bord.
    classe = models.ForeignKey(Classe, on_delete=models.PROTECT, related_name='bus')
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['immatriculation']

    def __str__(self):
        return f"{self.immatriculation} ({self.classe})"


class Trajet(models.Model):
    depart = models.ForeignKey(Destination, on_delete=models.PROTECT, related_name='trajets_depart')
    arrivee = models.ForeignKey(Destination, on_delete=models.PROTECT, related_name='trajets_arrivee')
    duree_estimee = models.DurationField()
    distance_km = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('depart', 'arrivee')
        ordering = ['depart__ville', 'arrivee__ville']

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

    @property
    def classe(self):
        """La classe du voyage est celle de son bus (un bus = une seule classe)."""
        return self.bus.classe


class Tarif(models.Model):
    """
    Prix adulte/enfant pour un voyage. Un seul tarif par voyage : la classe est
    déterminée par le bus assigné (un bus = une seule classe), donc plus besoin
    de la répéter ici.
    """
    voyage = models.OneToOneField(Voyage, on_delete=models.CASCADE, related_name='tarif')
    prix_adulte = models.DecimalField(max_digits=8, decimal_places=0)
    prix_enfant = models.DecimalField(max_digits=8, decimal_places=0)  # ≤ 12 ans

    def __str__(self):
        return f"{self.voyage} : {self.prix_adulte} FCFA"

    def prix_pour_age(self, age):
        AGE_LIMITE_ENFANT = 12
        return self.prix_enfant if age is not None and age <= AGE_LIMITE_ENFANT else self.prix_adulte