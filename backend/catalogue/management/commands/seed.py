from datetime import timedelta, time

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Utilisateur, Agent
from catalogue.models import Destination, Classe, Bus, Trajet, Voyage, Tarif, HoraireRecurrent
from catalogue.generation import generer_voyages_horizon

# Grille horaire imposée sur l'axe Yaoundé <-> Douala (les deux sens) :
# VIP et Premium partent toutes les 1h30, dernier départ 19h30 au plus tard.
# Classique et Confort partent toutes les heures, dernier départ 20h00 au plus tard.
HEURE_DEBUT = time(6, 0)
HEURE_LIMITE_HAUT_DE_GAMME = time(19, 30)
HEURE_LIMITE_STANDARD = time(20, 0)
INTERVALLE_HAUT_DE_GAMME = timedelta(minutes=90)   # VIP, Premium
INTERVALLE_STANDARD = timedelta(hours=1)           # Classique, Confort

PRIX_ADULTE_PAR_CLASSE = {'Classique': 5000, 'Confort': 7000, 'Premium': 9000, 'VIP': 12000}

HORIZON_SEED_JOURS = 14  # horizon glissant matérialisé au moment du seed (la commande
                          # generer_voyages, à lancer via cron, prend ensuite le relai)


class Command(BaseCommand):
    help = (
        "Peuple la base : destinations, classes, bus (1 classe chacun), trajets, "
        "horaires récurrents sur l'axe Yaoundé<->Douala (matérialisés sur 14 jours), "
        "quelques voyages ponctuels sur les autres trajets, et un agent."
    )

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help="Supprime les données de seed avant de les recréer.")

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write("Suppression des anciennes données de seed...")
            Tarif.objects.all().delete()
            Voyage.objects.filter(bus__immatriculation__startswith='CX-').delete()
            HoraireRecurrent.objects.all().delete()
            Trajet.objects.all().delete()
            Bus.objects.filter(immatriculation__startswith='CX-').delete()
            Classe.objects.all().delete()
            Destination.objects.all().delete()
            Agent.objects.filter(matricule__startswith='AG-').delete()
            Utilisateur.objects.filter(username__startswith='agent_').delete()

        destinations = self._creer_destinations()
        classes = self._creer_classes()
        bus_ponctuels = self._creer_bus(classes)
        trajets = self._creer_trajets(destinations)
        self._creer_horaires_axe_yaounde_douala(trajets, classes)
        self._generer_voyages()
        self._programmer_voyages_ponctuels(trajets, bus_ponctuels)
        self._creer_agent()

        self.stdout.write(self.style.SUCCESS("Seed terminé avec succès."))

    def _creer_destinations(self):
        villes = [
            ('Yaoundé', 'Centre'), ('Douala', 'Littoral'), ('Bafoussam', 'Ouest'),
            ('Bamenda', 'Nord-Ouest'), ('Garoua', 'Nord'),
        ]
        destinations = {}
        for ville, region in villes:
            d, _ = Destination.objects.get_or_create(ville=ville, defaults={'region': region})
            destinations[ville] = d
        self.stdout.write(f"  {len(destinations)} destinations ok")
        return destinations

    def _creer_classes(self):
        noms = ['Classique', 'Confort', 'Premium', 'VIP']
        classes = {}
        for ordre, nom in enumerate(noms):
            c, _ = Classe.objects.get_or_create(nom=nom, defaults={'ordre_affichage': ordre})
            classes[nom] = c
        self.stdout.write(f"  {len(classes)} classes ok")
        return classes

    def _creer_bus(self, classes):
        """
        2 bus par classe. Disposition avant->arrière : colonne avant réduite (porte
        avant), colonnes standards 2+2 (ou 3+2 pour Classique) avec une sortie centrale
        marquée au milieu, banquette pleine largeur au fond.
        """
        def plan_2_plus_2(nb_colonnes_standard, nb_sieges_fond, nb_sieges_avant=2):
            idx_sortie = nb_colonnes_standard // 2
            return {
                'colonnes': (
                    [{'nb_sieges': nb_sieges_avant, 'sortie_devant': True}]
                    + [{'nb_sieges': 4, 'sortie_centrale': (i == idx_sortie)} for i in range(nb_colonnes_standard)]
                    + [{'nb_sieges': nb_sieges_fond, 'banquette': True}]
                )
            }

        PLAN_VIP_PREMIUM = plan_2_plus_2(nb_colonnes_standard=10, nb_sieges_fond=6)   # 2+40+6=48
        PLAN_CONFORT = plan_2_plus_2(nb_colonnes_standard=15, nb_sieges_fond=8)        # 2+60+8=70
        PLAN_CLASSIQUE = {
            'colonnes': (
                [{'nb_sieges': 3, 'sortie_devant': True}]
                + [{'nb_sieges': 5, 'sortie_centrale': (i == 5)} for i in range(12)]
                + [{'nb_sieges': 7, 'banquette': True}]
            )
        }  # 3+60+7=70

        specs_par_classe = {
            'Classique': (PLAN_CLASSIQUE, 70),
            'Confort': (PLAN_CONFORT, 70),
            'Premium': (PLAN_VIP_PREMIUM, 48),
            'VIP': (PLAN_VIP_PREMIUM, 48),
        }
        prefixes = {'Classique': 'CX-1', 'Confort': 'CX-2', 'Premium': 'CX-3', 'VIP': 'CX-4'}

        bus_par_classe = {}
        total = 0
        for nom_classe, (plan, capacite) in specs_par_classe.items():
            bus_liste = []
            for i in range(1, 3):
                immat = f"{prefixes[nom_classe]}{i:02d}"
                bus, _ = Bus.objects.get_or_create(
                    immatriculation=immat,
                    defaults={'capacite': capacite, 'plan_sieges': plan, 'classe': classes[nom_classe]},
                )
                bus_liste.append(bus)
                total += 1
            bus_par_classe[nom_classe] = bus_liste
        self.stdout.write(f"  {total} bus ok (48 places VIP/Premium, 70 places Classique/Confort)")
        return bus_par_classe

    def _creer_trajets(self, destinations):
        paires = [
            ('Yaoundé', 'Douala', timedelta(hours=3, minutes=30), 250),
            ('Douala', 'Yaoundé', timedelta(hours=3, minutes=30), 250),
            ('Douala', 'Bafoussam', timedelta(hours=4, minutes=15), 290),
            ('Yaoundé', 'Bamenda', timedelta(hours=6), 366),
        ]
        trajets = {}
        for depart, arrivee, duree, distance in paires:
            t, _ = Trajet.objects.get_or_create(
                depart=destinations[depart], arrivee=destinations[arrivee],
                defaults={'duree_estimee': duree, 'distance_km': distance},
            )
            trajets[(depart, arrivee)] = t
        self.stdout.write(f"  {len(trajets)} trajets ok")
        return trajets

    def _creneaux(self, heure_limite, intervalle):
        creneaux = []
        courant = HEURE_DEBUT
        while courant <= heure_limite:
            creneaux.append(courant)
            minutes_totales = courant.hour * 60 + courant.minute + int(intervalle.total_seconds() // 60)
            if minutes_totales >= 24 * 60:
                break
            courant = time(hour=minutes_totales // 60, minute=minutes_totales % 60)
        return creneaux

    def _creer_horaires_axe_yaounde_douala(self, trajets, classes):
        """
        Crée les HoraireRecurrent (départs récursifs) sur Yaoundé<->Douala. La rotation
        des bus (retour 1h30-3h après arrivée) est gérée automatiquement à la
        matérialisation par catalogue.generation, à partir de ces horaires.
        """
        creneaux_haut_de_gamme = self._creneaux(HEURE_LIMITE_HAUT_DE_GAMME, INTERVALLE_HAUT_DE_GAMME)
        creneaux_standard = self._creneaux(HEURE_LIMITE_STANDARD, INTERVALLE_STANDARD)

        paires_axe = [('Yaoundé', 'Douala'), ('Douala', 'Yaoundé')]
        classes_par_grille = [('VIP', creneaux_haut_de_gamme), ('Premium', creneaux_haut_de_gamme),
                               ('Classique', creneaux_standard), ('Confort', creneaux_standard)]

        compteur = 0
        for depart, arrivee in paires_axe:
            trajet = trajets[(depart, arrivee)]
            for nom_classe, creneaux in classes_par_grille:
                prix_adulte = PRIX_ADULTE_PAR_CLASSE[nom_classe]
                prix_enfant = round(prix_adulte * 0.6, -2)
                for heure in creneaux:
                    _, cree = HoraireRecurrent.objects.get_or_create(
                        trajet=trajet, classe=classes[nom_classe], heure_depart=heure,
                        defaults={'prix_adulte': prix_adulte, 'prix_enfant': prix_enfant},
                    )
                    compteur += 1 if cree else 0
        self.stdout.write(f"  {compteur} horaires récurrents créés sur l'axe Yaoundé <-> Douala")

    def _generer_voyages(self):
        resultats = generer_voyages_horizon(horizon_jours=HORIZON_SEED_JOURS)
        self.stdout.write(
            f"  {resultats['crees']} voyages matérialisés sur {HORIZON_SEED_JOURS} jours "
            f"({resultats['deja_existants']} déjà existants)"
        )
        if resultats['classes_sans_bus']:
            self.stdout.write(self.style.WARNING(f"  Classes sans bus actif : {', '.join(resultats['classes_sans_bus'])}"))
        if resultats['violations_rotation']:
            self.stdout.write(self.style.WARNING(
                f"  {resultats['violations_rotation']} créneau(x) n'ont pas respecté la fenêtre de rotation (flotte réduite : 2 bus/classe)."
            ))

    def _bus_disponible(self, bus, debut, fin):
        """Aucun voyage déjà programmé pour ce bus ne doit chevaucher [debut, fin)."""
        for v in Voyage.objects.filter(bus=bus).exclude(statut='annule'):
            v_debut = v.date_heure_depart
            v_fin = v_debut + v.trajet.duree_estimee
            if debut < v_fin and v_debut < fin:
                return False
        return True

    def _programmer_voyages_ponctuels(self, trajets, bus_ponctuels):
        """
        Les trajets hors axe Yaoundé<->Douala (pas de retour défini) restent gérés en
        voyages ponctuels créés directement — pas d'horaire récurrent, pour illustrer
        les deux modes de programmation disponibles à l'admin. Utilise un pool de bus
        dédié (bus_ponctuels), séparé de celui de l'axe, pour ne jamais entrer en
        conflit avec sa rotation.
        """
        from datetime import datetime

        jour = timezone.localdate() + timedelta(days=1)
        autres = [('Douala', 'Bafoussam'), ('Yaoundé', 'Bamenda')]
        classes_cycle = ['Confort', 'VIP', 'Classique']
        compteur = 0
        ignores = 0
        for depart, arrivee in autres:
            trajet = trajets[(depart, arrivee)]
            for j, heure_h in enumerate([8, 12, 16]):
                nom_classe = classes_cycle[j % len(classes_cycle)]
                date_heure = timezone.make_aware(datetime.combine(jour, time(hour=heure_h)))
                fin = date_heure + trajet.duree_estimee

                bus = next((b for b in bus_ponctuels[nom_classe] if self._bus_disponible(b, date_heure, fin)), None)
                if bus is None:
                    ignores += 1
                    continue

                voyage, _ = Voyage.objects.get_or_create(
                    trajet=trajet, bus=bus, date_heure_depart=date_heure,
                    defaults={'statut': 'planifie'},
                )
                if not hasattr(voyage, 'tarif'):
                    prix_adulte = PRIX_ADULTE_PAR_CLASSE[nom_classe]
                    Tarif.objects.create(voyage=voyage, prix_adulte=prix_adulte, prix_enfant=round(prix_adulte * 0.6, -2))
                compteur += 1
        message = f"  {compteur} voyages ponctuels programmés sur les autres trajets"
        if ignores:
            message += f" ({ignores} ignoré(s), aucun bus disponible à ce créneau)"
        self.stdout.write(message)

    def _creer_agent(self):
        utilisateur, cree = Utilisateur.objects.get_or_create(
            username='agent_yaounde',
            defaults={'telephone': '699000000', 'role': Utilisateur.ROLE_AGENT, 'first_name': 'Agent', 'last_name': 'Test'},
        )
        if cree:
            utilisateur.set_password('agent1234')
            utilisateur.save()
        Agent.objects.get_or_create(
            utilisateur=utilisateur, defaults={'agence': 'Agence Yaoundé Centre', 'matricule': 'AG-0001'},
        )
        self.stdout.write(self.style.WARNING("  agent ok (username: agent_yaounde / mot de passe: agent1234 — à changer !)"))