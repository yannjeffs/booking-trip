from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Utilisateur, Agent
from catalogue.models import Destination, Classe, Bus, Trajet, Voyage, Tarif


class Command(BaseCommand):
    help = "Peuple la base avec des données de test : destinations, classes, bus, trajets, voyages, tarifs et un agent."

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help="Supprime les données de test précédemment créées par ce seed avant de les recréer.",
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write("Suppression des anciennes données de seed...")
            Voyage.objects.filter(bus__immatriculation__startswith='CX-').delete()
            Trajet.objects.all().delete()
            Bus.objects.filter(immatriculation__startswith='CX-').delete()
            Classe.objects.all().delete()
            Destination.objects.all().delete()
            Agent.objects.filter(matricule__startswith='AG-').delete()
            Utilisateur.objects.filter(username__startswith='agent_').delete()

        destinations = self._creer_destinations()
        classes = self._creer_classes()
        bus_liste = self._creer_bus()
        trajets = self._creer_trajets(destinations)
        voyages = self._creer_voyages(trajets, bus_liste)
        self._creer_tarifs(voyages, classes)
        self._creer_agent()

        self.stdout.write(self.style.SUCCESS("Seed terminé avec succès."))

    def _creer_destinations(self):
        villes = [
            ('Yaoundé', 'Centre'),
            ('Douala', 'Littoral'),
            ('Bafoussam', 'Ouest'),
            ('Bamenda', 'Nord-Ouest'),
            ('Garoua', 'Nord'),
        ]
        destinations = {}
        for ville, region in villes:
            destination, _ = Destination.objects.get_or_create(ville=ville, defaults={'region': region})
            destinations[ville] = destination
        self.stdout.write(f"  {len(destinations)} destinations ok")
        return destinations

    def _creer_classes(self):
        noms = ['Classique', 'Confort', 'Premium', 'VIP']
        classes = {}
        for ordre, nom in enumerate(noms):
            classe, _ = Classe.objects.get_or_create(nom=nom, defaults={'ordre_affichage': ordre})
            classes[nom] = classe
        self.stdout.write(f"  {len(classes)} classes ok")
        return classes

    def _creer_bus(self):
        plan_standard = {'rangees': 10, 'colonnes': ['A', 'B', 'C', 'D']}  # 40 places, 2+2
        plan_vip = {'rangees': 8, 'colonnes': ['A', 'B', 'C']}  # 24 places, 2+1
        specs = [
            ('CX-101', 40, plan_standard),
            ('CX-102', 40, plan_standard),
            ('CX-201', 24, plan_vip),
        ]
        bus_liste = []
        for immat, capacite, plan in specs:
            bus, _ = Bus.objects.get_or_create(
                immatriculation=immat,
                defaults={'capacite': capacite, 'plan_sieges': plan},
            )
            bus_liste.append(bus)
        self.stdout.write(f"  {len(bus_liste)} bus ok")
        return bus_liste

    def _creer_trajets(self, destinations):
        paires = [
            ('Yaoundé', 'Douala', timedelta(hours=3, minutes=30), 250),
            ('Douala', 'Yaoundé', timedelta(hours=3, minutes=30), 250),
            ('Douala', 'Bafoussam', timedelta(hours=4, minutes=15), 290),
            ('Yaoundé', 'Bamenda', timedelta(hours=6), 366),
        ]
        trajets = []
        for depart, arrivee, duree, distance in paires:
            trajet, _ = Trajet.objects.get_or_create(
                depart=destinations[depart],
                arrivee=destinations[arrivee],
                defaults={'duree_estimee': duree, 'distance_km': distance},
            )
            trajets.append(trajet)
        self.stdout.write(f"  {len(trajets)} trajets ok")
        return trajets

    def _creer_voyages(self, trajets, bus_liste):
        from datetime import datetime, time

        aujourd_hui = timezone.localdate()
        voyages = []
        # Pour chaque trajet, 3 départs dans les prochains jours, sur des bus différents.
        # Basé sur la date (pas l'heure d'exécution) pour que relancer le seed le même
        # jour ne recrée pas de doublons.
        for i, trajet in enumerate(trajets):
            for j in range(3):
                jour = aujourd_hui + timedelta(days=j + 1)
                heure = time(hour=8 + j * 4)
                depart = timezone.make_aware(datetime.combine(jour, heure))
                bus = bus_liste[(i + j) % len(bus_liste)]
                voyage, _ = Voyage.objects.get_or_create(
                    trajet=trajet,
                    bus=bus,
                    date_heure_depart=depart,
                    defaults={'statut': 'planifie'},
                )
                voyages.append(voyage)
        self.stdout.write(f"  {len(voyages)} voyages ok")
        return voyages

    def _creer_tarifs(self, voyages, classes):
        # Prix de base par classe (adulte), le tarif enfant est ~40% moins cher
        prix_adulte_par_classe = {
            'Classique': 5000,
            'Confort': 7000,
            'Premium': 9000,
            'VIP': 12000,
        }
        compteur = 0
        for voyage in voyages:
            # Un bus standard propose Classique/Confort, un bus VIP propose Premium/VIP
            noms_classes = ['Classique', 'Confort'] if voyage.bus.capacite == 40 else ['Premium', 'VIP']
            for nom in noms_classes:
                prix_adulte = prix_adulte_par_classe[nom]
                prix_enfant = round(prix_adulte * 0.6, -2)  # arrondi à la centaine
                _, created = Tarif.objects.get_or_create(
                    voyage=voyage,
                    classe=classes[nom],
                    defaults={'prix_adulte': prix_adulte, 'prix_enfant': prix_enfant},
                )
                compteur += 1 if created else 0
        self.stdout.write(f"  tarifs ok ({compteur} créés)")

    def _creer_agent(self):
        utilisateur, cree = Utilisateur.objects.get_or_create(
            username='agent_yaounde',
            defaults={
                'telephone': '699000000',
                'role': Utilisateur.ROLE_AGENT,
                'first_name': 'Agent',
                'last_name': 'Test',
            },
        )
        if cree:
            utilisateur.set_password('agent1234')
            utilisateur.save()

        Agent.objects.get_or_create(
            utilisateur=utilisateur,
            defaults={'agence': 'Agence Yaoundé Centre', 'matricule': 'AG-0001'},
        )
        self.stdout.write(
            self.style.WARNING("  agent ok (username: agent_yaounde / mot de passe: agent1234 — à changer !)")
        )