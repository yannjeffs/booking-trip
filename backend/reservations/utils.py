from .models import Reservation, Passager


def get_tous_les_sieges(bus):
    """
    Génère les numéros de sièges dans l'ordre avant → arrière, colonne par colonne
    (chaque colonne = une position du bus dans sa longueur). La colonne avant est
    réduite (porte avant), la colonne du fond ('banquette') est pleine largeur sans
    couloir. Numérotation simple, sans préfixe.
    """
    plan = bus.plan_sieges
    sieges = []
    numero = 1
    for colonne in plan['colonnes']:
        for _ in range(colonne['nb_sieges']):
            sieges.append(str(numero))
            numero += 1
    return sieges


def get_sieges_occupes(voyage):
    reservations_actives = Reservation.objects.filter(voyage=voyage).exclude(
        statut__in=[Reservation.STATUT_ANNULEE, Reservation.STATUT_EXPIREE]
    )
    reservations_actives = [r for r in reservations_actives if not r.est_expiree]
    ids = [r.id for r in reservations_actives]
    return set(Passager.objects.filter(reservation_id__in=ids).values_list('siege', flat=True))


def get_sieges_disponibles(voyage):
    tous = set(get_tous_les_sieges(voyage.bus))
    occupes = get_sieges_occupes(voyage)
    return sorted(tous - occupes, key=int)


def plan_sieges_avec_statut(voyage):
    """
    Retourne le plan groupé par colonne (avant → arrière), avec le statut de chaque
    siège et les marqueurs de sortie/banquette pour l'affichage.
    """
    plan = voyage.bus.plan_sieges
    occupes = get_sieges_occupes(voyage)
    colonnes = []
    numero = 1

    for index, colonne in enumerate(plan['colonnes']):
        sieges = []
        for _ in range(colonne['nb_sieges']):
            s = str(numero)
            sieges.append({'numero': s, 'statut': 'occupe' if s in occupes else 'libre'})
            numero += 1
        colonnes.append({
            'index': index,
            'sieges': sieges,
            'sortie_devant': colonne.get('sortie_devant', False),
            'sortie_centrale': colonne.get('sortie_centrale', False),
            'banquette': colonne.get('banquette', False),
        })

    return colonnes