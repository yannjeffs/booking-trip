import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VoyageService } from '../../core/services/voyage.service';
import { Destination, Voyage, TypeBillet } from '../../core/models/models';
import { HeaderPublic } from "../../shared/header-public/header-public";

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderPublic],
  templateUrl: './recherche.html',
})
export class Recherche implements OnInit {
  private voyageService = inject(VoyageService);
  private router = inject(Router);

  destinations: Destination[] = [];
  resultatsAller: Voyage[] = [];
  resultatsRetour: Voyage[] = [];
  rechercheEffectuee = false;
  chargement = false;

  type: TypeBillet = 'aller_simple';
  depart = '';
  arrivee = '';
  date = new Date().toISOString().slice(0, 10);
  dateRetour = new Date().toISOString().slice(0, 10);

  voyageAllerChoisi: Voyage | null = null;
  voyageRetourChoisi: Voyage | null = null;

  ngOnInit(): void {
    this.voyageService.getDestinations().subscribe({
      next: (reponse) => (this.destinations = reponse.results ?? (reponse as unknown as Destination[])),
    });
  }

  rechercher(): void {
    this.chargement = true;
    this.rechercheEffectuee = true;
    this.voyageAllerChoisi = null;
    this.voyageRetourChoisi = null;

    this.voyageService.rechercherVoyages({ depart: this.depart, arrivee: this.arrivee, date: this.date }).subscribe({
      next: (reponse) => {
        this.resultatsAller = reponse.results ?? (reponse as unknown as Voyage[]);
        if (this.type === 'aller_retour') {
          this.voyageService.rechercherVoyages({ depart: this.arrivee, arrivee: this.depart, date: this.dateRetour }).subscribe({
            next: (r2) => {
              this.resultatsRetour = r2.results ?? (r2 as unknown as Voyage[]);
              this.chargement = false;
            },
            error: () => (this.chargement = false),
          });
        } else {
          this.chargement = false;
        }
      },
      error: () => (this.chargement = false),
    });
  }

  choisirAller(voyage: Voyage): void {
    this.voyageAllerChoisi = voyage;
    if (this.type === 'aller_simple') this.continuer();
  }

  choisirRetour(voyage: Voyage): void {
    this.voyageRetourChoisi = voyage;
    this.continuer();
  }

  continuer(): void {
    if (!this.voyageAllerChoisi) return;
    if (this.type === 'aller_retour' && !this.voyageRetourChoisi) return;

    this.router.navigate(['/voyages', this.voyageAllerChoisi.id, 'sieges'], {
      queryParams: {
        type: this.type,
        retour: this.type === 'aller_retour' ? this.voyageRetourChoisi!.id : null,
      },
    });
  }
}
