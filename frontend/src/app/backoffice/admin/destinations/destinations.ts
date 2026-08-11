// backoffice/admin/destinations/destinations.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogueAdminService } from '../../../core/services/catalogue-admin.service';
import { Destination } from '../../../core/models/models';

@Component({
  selector: 'app-admin-destinations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './destinations.html',
})
export class Destinations implements OnInit {
  private service = inject(CatalogueAdminService);

  destinations: Destination[] = [];
  chargement = true;
  enEdition: Destination | null = null;
  formulaire = { ville: '', region: '' };
  erreur = '';

  ngOnInit(): void { this.charger(); }

  private charger(): void {
    this.chargement = true;
    this.service.listerDestinations().subscribe({
      next: (r) => { this.destinations = Array.isArray(r) ? r : r.results; this.chargement = false; },
      error: () => (this.chargement = false),
    });
  }

  ouvrirCreation(): void { this.enEdition = null; this.formulaire = { ville: '', region: '' }; }
  ouvrirEdition(destination: Destination): void { this.enEdition = destination; this.formulaire = { ville: destination.ville, region: destination.region }; }

  enregistrer(): void {
    this.erreur = '';
    const requete = this.enEdition
      ? this.service.modifierDestination(this.enEdition.id, this.formulaire)
      : this.service.creerDestination(this.formulaire);
    requete.subscribe({
      next: () => { this.charger(); this.ouvrirCreation(); },
      error: () => (this.erreur = "Impossible d'enregistrer cette destination."),
    });
  }

  supprimer(destination: Destination): void {
    if (!confirm(`Supprimer ${destination.ville} ?`)) return;
    this.service.supprimerDestination(destination.id).subscribe({ next: () => this.charger() });
  }
}
