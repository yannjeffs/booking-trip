from django.core.management.base import BaseCommand
from catalogue.generation import generer_voyages_horizon, HORIZON_JOURS_DEFAUT


class Command(BaseCommand):
    help = (
        "Matérialise les Voyage à venir à partir des HoraireRecurrent actifs, sur un "
        "horizon glissant. À lancer quotidiennement (cron) pour que l'horizon reste "
        "toujours plein ; sans effet si déjà généré (idempotent)."
    )

    def add_arguments(self, parser):
        parser.add_argument('--horizon', type=int, default=HORIZON_JOURS_DEFAUT, help="Nombre de jours à générer à partir d'aujourd'hui.")

    def handle(self, *args, **options):
        resultats = generer_voyages_horizon(horizon_jours=options['horizon'])
        self.stdout.write(self.style.SUCCESS(
            f"{resultats['crees']} voyages créés, {resultats['deja_existants']} déjà existants "
            f"(horizon {options['horizon']} jours)."
        ))
        if resultats['classes_sans_bus']:
            self.stdout.write(self.style.WARNING(
                f"Classes sans bus actif (aucun voyage généré pour elles) : {', '.join(resultats['classes_sans_bus'])}"
            ))
        if resultats['violations_rotation']:
            self.stdout.write(self.style.WARNING(
                f"{resultats['violations_rotation']} créneau(x) n'ont pas pu respecter la fenêtre de rotation "
                f"(1h30-3h) faute de bus disponible — la flotte est sans doute trop réduite pour cette densité d'horaires."
            ))