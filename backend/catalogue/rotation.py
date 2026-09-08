"""
Assignation des bus aux créneaux horaires d'une journée, pour une classe donnée sur un
axe bidirectionnel (ex: Yaoundé <-> Douala).

Règles métier :
1. Position : un bus ne peut desservir un départ que s'il se trouve physiquement dans
   la ville de départ à cet instant (un bus arrivé à Yaoundé ne peut pas être affecté
   à un départ de Douala tant qu'il n'a pas fait le trajet retour).
2. Rotation : un bus qui arrive à destination doit repartir en sens inverse entre
   1h30 et 3h00 après son arrivée (temps de nettoyage/réembarquement) — pas avant
   (le bus est encore en préparation), pas après (on ne le laisse pas traîner).

Implémenté comme une simulation événementielle : les départs (aller + retour confondus)
sont traités dans l'ordre chronologique ; chaque événement reçoit, parmi les bus déjà
présents dans la bonne ville, le plus adapté selon la règle de rotation.

Hypothèse de position initiale (faute de connaître le dépôt réel de chaque bus) : la
flotte est répartie à parts égales entre les deux villes en début de journée.
"""
from datetime import datetime, timedelta

DELAI_MIN_ROTATION = timedelta(hours=1, minutes=30)
DELAI_MAX_ROTATION = timedelta(hours=3)

def _en_datetime(jour, heure):
    return datetime.combine(jour, heure)

def assigner_bus(jour, heures_aller, heures_retour, duree_trajet, bus_liste, ville_depart_aller, ville_depart_retour):
    """
    Retourne (assignation_aller, assignation_retour, nb_violations).
    nb_violations compte les créneaux où, faute de bus disponible ET positionné dans
    la bonne ville, un bus a dû être réaffecté hors des règles normales (flotte trop
    réduite, ou mal répartie, pour la densité d'horaires demandée sur cette classe).
    """
    if not bus_liste:
        raise ValueError("Aucun bus disponible pour cette classe !")

    evenements = sorted(
        [(_en_datetime(jour, h), 'aller', h) for h in heures_aller] +
        [(_en_datetime(jour, h), 'retour', h) for h in heures_retour]
    )

    # Position et disponibilité initiales : flotte répartie moitié-moitié entre les
    # deux villes, aucune contrainte de temps tant qu'un bus n'a pas encore roulé.
    etat = {}
    for i, bus in enumerate(bus_liste):
        position_initiale = ville_depart_aller if i % 2 == 0 else ville_depart_retour
        etat[bus.id] =  {'position': position_initiale, 'disponible': None}

    assignation_aller = {}
    assignation_retour = {}
    nb_violations = 0

    for depart, direction, heure in evenements:
        arrivee = depart + duree_trajet
        ville_requise = ville_depart_aller if direction == 'aller' else ville_depart_retour
        ville_arrivee = ville_depart_retour if direction =='retour' else ville_depart_aller

        presents = [b for b in bus_liste if etat[b.id]['position'] == ville_requise]

        # 1. Priorité à un bus présent dont ce départ tombe pile dans sa fenêtre de
        #    rotation (réutilisation idéale : c'est le même bus qui repart en sens inverse).
        candidat = next(
            (b for b in presents if etat[b.id]['disponible'] and etat[b.id]['disponible'][0] <= depart <= etat[b.id]['disponible'][1]),
            None
        )

        # 2. Sinon, un bus présent totalement libre (jamais utilisé, ou dont la fenêtre
        #    de rotation est déjà dépassée — plus aucune obligation dessus).
        if candidat is None:
            candidat = next(
                (b for b in presents if etat[b.id]['disponible'] is None or depart > etat[b.id]['disponible'][1]),
                None
            )

        # 3. Un bus présent mais encore dans sa fenêtre de rotation minimale (on le
        #    réutilise un peu en avance plutôt que de laisser le créneau sans bus).
        if candidat is None and presents:
            candidat = min(presents, key=lambda b: etat[b.id]['disponible'][0] if etat[b.id]['disponible'] else depart)
            nb_violations += 1

        # 4. Dernier recours : aucun bus n'est physiquement dans la bonne ville (flotte
        #    mal répartie ou insuffisante) — on retélé-porte le bus le plus proche
        #    disponible, à signaler impérativement à l'admin comme trajet à couvrir
        #    par un renfort réel.
        if candidat is None:
            candidat = min(bus_liste, key=lambda b: etat[b.id]['disponible'][0] if etat[b.id]['disponible'] else depart)
            nb_violations += 1

        if direction == 'aller':
            assignation_aller[heure] = candidat
        else:
            assignation_retour[heure] = candidat
        
        etat[candidat.id] = {
            'position': ville_arrivee,
            'disponible': (arrivee + DELAI_MIN_ROTATION, arrivee + DELAI_MAX_ROTATION)
        }

    return assignation_aller, assignation_retour, nb_violations
