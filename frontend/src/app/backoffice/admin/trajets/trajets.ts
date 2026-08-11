// backoffice/admin/trajets/trajets.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogueAdminService } from '../../../core/services/catalogue-admin.service';
import { Trajet, Destination } from '../../../core/models/models';

@Component({
  selector: 'app-admin-trajets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trajets.html',
})
export class Trajets implements OnInit {
  private service = inject(CatalogueAdminService);
  trajets: Trajet[] = [];
  destinations: Destination[] = [];
  chargement = true;
  erreur = '';
  formulaire = { depart: null as number | null, arrivee: null as number | null, heures: 3, minutes: 30, distance_km: null as number | null };

  ngOnInit(): void {
    this.service.listerDestinations().subscribe({ next: (r) => (this.destinations = Array.isArray(r) ? r : r.results) });
    this.charger();
  }

  private charger(): void {
    this.chargement = true;
    this.service.listerTrajets().subscribe({
      next: (r) => { this.trajets = Array.isArray(r) ? r : r.results; this.chargement = false; },
      error: () => (this.chargement = false),
    });
  }

  creer(): void {
    if (!this.formulaire.depart || !this.formulaire.arrivee) return;
    this.erreur = '';
    const duree = `${String(this.formulaire.heures).padStart(2, '0')}:${String(this.formulaire.minutes).padStart(2, '0')}:00`;
    this.service.creerTrajet({
      depart: this.formulaire.depart, arrivee: this.formulaire.arrivee, duree_estimee: duree,
      distance_km: this.formulaire.distance_km ?? undefined,
    }).subscribe({
      next: () => { this.charger(); this.formulaire = { depart: null, arrivee: null, heures: 3, minutes: 30, distance_km: null }; },
      error: () => (this.erreur = 'Impossible de créer ce trajet (existe peut-être déjà).'),
    });
  }

  supprimer(trajet: Trajet): void {
    if (!confirm(`Supprimer le trajet ${trajet.depart.ville} → ${trajet.arrivee.ville} ?`)) return;
    this.service.supprimerTrajet(trajet.id).subscribe({ next: () => this.charger() });
  }
}
