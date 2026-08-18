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
    
    @property
    def trajet_retour(self):
        """Le trajet inverse (B→A), s'il existe — utilisé pour la rotation des bus."""
        return Trajet.objects.filter(depart=self.arrivee, arrivee=self.depart).first()


class HoraireRecurrent(models.Model):
    """
    Un départ récurrent défini par l'admin : trajet + classe + heure de départ + prix.
    Se matérialise chaque jour en un Voyage réservable, sur un horizon glissant généré
    par la commande `generer_voyages`. Désactiver ou modifier un horaire n'affecte que
    les occurrences futures non encore réservées (les billets déjà vendus restent intacts).
    """
    trajet = models.ForeignKey(Trajet, on_delete=models.CASCADE, related_name='horaires_recurrents')
    classe = models.ForeignKey(Classe, on_delete=models.CASCADE, related_name='horaires_recurrents')
    heure_depart = models.TimeField()
    prix_adulte = models.DecimalField(max_digits=8, decimal_places=0)
    prix_enfant = models.DecimalField(max_digits=8, decimal_places=0)
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('trajet', 'classe', 'heure_depart')
        ordering = ['trajet', 'heure_depart']

    def __str__(self):
        return f"{self.trajet} · {self.classe} · {self.heure_depart:%H:%M}"


class Voyage(models.Model):
    trajet = models.ForeignKey(Trajet, on_delete=models.PROTECT, related_name='voyages')
    bus = models.ForeignKey(Bus, on_delete=models.PROTECT, related_name='voyages')
    date_heure_depart = models.DateTimeField()
    statut = models.CharField(
        max_length=15,
        choices=[('planifie', 'Planifié'), ('en_cours', 'En cours'), ('termine', 'Terminé'), ('annule', 'Annulé')],
        default='planifie',
    )
    # Rempli si ce voyage a été matérialisé depuis un horaire récurrent (permet de le
    # régénérer/annuler proprement quand l'admin modifie ou retire l'horaire).
    horaire_recurrent = models.ForeignKey(
        HoraireRecurrent, null=True, blank=True, on_delete=models.SET_NULL, related_name='voyages'
    )

    class Meta:
        ordering = ['date_heure_depart']
        # Un même horaire récurrent ne peut matérialiser qu'un seul voyage par jour
        # (les valeurs NULL — voyages ponctuels — ne sont jamais considérées en conflit).
        unique_together = ('horaire_recurrent', 'date_heure_depart')

    def __str__(self):
        return f"{self.trajet} - {self.date_heure_depart:%d/%m/%Y %H:%M}"

    @property
    def classe(self):
        return self.bus.classe

    @property
    def a_des_reservations(self):
        return self.reservations.exclude(statut__in=['annulee', 'expiree']).exists()


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