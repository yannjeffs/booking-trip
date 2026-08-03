from .models import Reservation, Passager


def get_tous_les_sieges(bus):
    """
    Génère la liste de tous les numéros de sièges à partir de plan_sieges,
    ex: {"rangees": 10, "colonnes": ["A","B","C","D"]} -> ["1A","1B","1C","1D","2A",...]
    """
    plan = bus.plan_sieges
    return [
        f"{rangee}{colonne}"
        for rangee in range(1, plan['rangees'] + 1)
        for colonne in plan['colonnes']
    ]


def get_sieges_occupes(voyage):
    """
    Sièges considérés indisponibles pour un voyage : ceux liés à une réservation
    confirmée, ou en attente de paiement mais pas encore expirée.
    """
    reservations_actives = Reservation.objects.filter(voyage=voyage).exclude(
        statut__in=[Reservation.STATUT_ANNULEE, Reservation.STATUT_EXPIREE]
    )
    reservations_actives = [r for r in reservations_actives if not r.est_expiree]
    ids = [r.id for r in reservations_actives]
    return set(Passager.objects.filter(reservation_id__in=ids).values_list('siege', flat=True))


def get_sieges_disponibles(voyage):
    tous = set(get_tous_les_sieges(voyage.bus))
    occupes = get_sieges_occupes(voyage)
    return sorted(tous - occupes)


def plan_sieges_avec_statut(voyage):
    occupes = get_sieges_occupes(voyage)
    return [
        {'numero': s, 'statut': 'occupe' if s in occupes else 'libre'}
        for s in get_tous_les_sieges(voyage.bus)
    ]