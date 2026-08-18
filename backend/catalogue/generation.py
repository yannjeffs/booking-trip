"""
Matérialisation des Voyage à partir des HoraireRecurrent actifs, jour par jour,
avec rotation des bus entre un axe et son retour (voir rotation.py).

Idempotent : un même (trajet, date_heure_depart) n'est jamais recréé — si un Voyage
existe déjà à cet horaire (généré précédemment, ou déjà réservé), on le laisse tel
quel, y compris son bus assigné (pour ne jamais perturber une réservation existante).
"""
from datetime import datetime, timedelta

from django.utils import timezone

from .models import Voyage, Tarif, HoraireRecurrent, Bus
from .rotation import assigner_bus

HORIZON_JOURS_DEFAUT = 30


def generer_voyages_du_jour(jour):
    """Matérialise les voyages du jour donné pour tous les horaires récurrents actifs."""
    resultats = {'crees': 0, 'deja_existants': 0, 'classes_sans_bus': set(), 'violations_rotation': 0}

    horaires_actifs = list(
        HoraireRecurrent.objects.filter(actif=True).select_related('trajet', 'trajet__depart', 'trajet__arrivee', 'classe')
    )
    par_trajet_classe = {}
    for h in horaires_actifs:
        par_trajet_classe.setdefault((h.trajet_id, h.classe_id), []).append(h)

    traites = set()
    for (trajet_id, classe_id), horaires in par_trajet_classe.items():
        if (trajet_id, classe_id) in traites:
            continue
        trajet = horaires[0].trajet
        classe = horaires[0].classe
        trajet_retour = trajet.trajet_retour
        horaires_retour = par_trajet_classe.get((trajet_retour.id, classe_id), []) if trajet_retour else []

        traites.add((trajet_id, classe_id))
        if trajet_retour:
            traites.add((trajet_retour.id, classe_id))

        bus_liste = list(Bus.objects.filter(classe_id=classe_id, actif=True))
        if not bus_liste:
            resultats['classes_sans_bus'].add(classe.nom)
            continue

        heures_aller = [h.heure_depart for h in horaires]

        if horaires_retour:
            heures_retour = [h.heure_depart for h in horaires_retour]
            assignation_aller, assignation_retour, nb_violations = assigner_bus(
                jour, heures_aller, heures_retour, trajet.duree_estimee, bus_liste,
                ville_depart_aller=trajet.depart.ville, ville_depart_retour=trajet.arrivee.ville,
            )
            if nb_violations:
                resultats['violations_rotation'] += nb_violations
        else:
            # Pas de trajet retour actif pour cette classe : tournante simple, sans contrainte de rotation.
            assignation_aller = {h.heure_depart: bus_liste[i % len(bus_liste)] for i, h in enumerate(horaires)}
            assignation_retour = {}

        for h in horaires:
            _materialiser(h, jour, assignation_aller[h.heure_depart], resultats)
        for h in horaires_retour:
            _materialiser(h, jour, assignation_retour[h.heure_depart], resultats)

    return resultats


def _materialiser(horaire, jour, bus, resultats):
    date_heure = timezone.make_aware(datetime.combine(jour, horaire.heure_depart))
    # Clé par horaire_recurrent (pas seulement trajet+date_heure_depart) : deux classes
    # différentes peuvent avoir un départ à la même heure sur le même trajet (deux bus
    # distincts) — les fusionner serait une erreur.
    voyage, cree = Voyage.objects.get_or_create(
        horaire_recurrent=horaire,
        date_heure_depart=date_heure,
        defaults={'trajet': horaire.trajet, 'bus': bus, 'statut': 'planifie'},
    )
    if not hasattr(voyage, 'tarif'):
        Tarif.objects.create(voyage=voyage, prix_adulte=horaire.prix_adulte, prix_enfant=horaire.prix_enfant)
    resultats['crees' if cree else 'deja_existants'] += 1


def generer_voyages_horizon(horizon_jours=HORIZON_JOURS_DEFAUT, a_partir_de=None):
    """Matérialise les voyages pour chaque jour de l'horizon glissant (aujourd'hui inclus)."""
    debut = a_partir_de or timezone.localdate()
    total = {'crees': 0, 'deja_existants': 0, 'classes_sans_bus': set(), 'violations_rotation': 0}
    for i in range(horizon_jours):
        jour = debut + timedelta(days=i)
        r = generer_voyages_du_jour(jour)
        total['crees'] += r['crees']
        total['deja_existants'] += r['deja_existants']
        total['classes_sans_bus'] |= r['classes_sans_bus']
        total['violations_rotation'] += r['violations_rotation']
    return total


def regenerer_horaire(horaire, horizon_jours=HORIZON_JOURS_DEFAUT):
    """
    À appeler après modification de l'heure d'un horaire récurrent : supprime ses
    occurrences futures non réservées (elles seront recréées à la nouvelle heure),
    laisse intactes celles déjà réservées, puis régénère l'horizon.
    """
    maintenant = timezone.now()
    futurs_non_reserves = [
        v for v in horaire.voyages.filter(date_heure_depart__gte=maintenant) if not v.a_des_reservations
    ]
    for v in futurs_non_reserves:
        v.delete()
    return generer_voyages_horizon(horizon_jours)


def retirer_horaire(horaire):
    """
    Désactive un horaire récurrent (ne sera plus régénéré) : supprime ses occurrences
    futures non réservées, et marque 'annule' celles déjà réservées (pour signalement
    au client/agent — le remboursement reste une action manuelle séparée).
    """
    horaire.actif = False
    horaire.save(update_fields=['actif'])

    maintenant = timezone.now()
    for v in horaire.voyages.filter(date_heure_depart__gte=maintenant):
        if v.a_des_reservations:
            v.statut = 'annule'
            v.save(update_fields=['statut'])
        else:
            v.delete()