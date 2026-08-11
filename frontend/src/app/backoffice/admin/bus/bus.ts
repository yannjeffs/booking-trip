// backoffice/admin/bus/bus.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogueAdminService } from '../../../core/services/catalogue-admin.service';
import { Bus as BusModel } from '../../../core/models/models';

@Component({
  selector: 'app-admin-bus',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bus.html',
})
export class Bus implements OnInit {
  private service = inject(CatalogueAdminService);
  busListe: BusModel[] = [];
  chargement = true;
  erreur = '';
  formulaire = { immatriculation: '', rangees: 10, colonnes: 'A,B,C,D', actif: true };

  ngOnInit(): void { this.charger(); }

  private charger(): void {
    this.chargement = true;
    this.service.listerBus().subscribe({
      next: (r) => { this.busListe = Array.isArray(r) ? r : r.results; this.chargement = false; },
      error: () => (this.chargement = false),
    });
  }

  capacite(): number {
    const colonnes = this.formulaire.colonnes.split(',').filter((c) => c.trim());
    return this.formulaire.rangees * colonnes.length;
  }

  creer(): void {
    this.erreur = '';
    const colonnes = this.formulaire.colonnes.split(',').map((c) => c.trim()).filter(Boolean);
    this.service.creerBus({
      immatriculation: this.formulaire.immatriculation,
      capacite: this.formulaire.rangees * colonnes.length,
      plan_sieges: { rangees: this.formulaire.rangees, colonnes },
      actif: this.formulaire.actif,
    }).subscribe({
      next: () => { this.charger(); this.formulaire = { immatriculation: '', rangees: 10, colonnes: 'A,B,C,D', actif: true }; },
      error: () => (this.erreur = "Impossible de créer ce bus (immatriculation déjà utilisée ?)."),
    });
  }

  basculerActif(bus: BusModel): void {
    this.service.modifierBus(bus.id, { actif: !bus.actif }).subscribe({ next: () => this.charger() });
  }

  supprimer(bus: BusModel): void {
    if (!confirm(`Supprimer le bus ${bus.immatriculation} ?`)) return;
    this.service.supprimerBus(bus.id).subscribe({ next: () => this.charger() });
  }
}
