import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VoyageService } from '../../core/services/voyage.service';
import { Destination, Voyage } from '../../core/models/models';

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recherche.html',
})
export class Recherche implements OnInit {
  private voyageService = inject(VoyageService);
  private router = inject(Router);

  destinations: Destination[] = [];
  resultats: Voyage[] = [];
  rechercheEffectuee = false;
  chargement = false;

  depart = '';
  arrivee = '';
  date = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.voyageService.getDestinations().subscribe({
      next: (reponse) => (this.destinations = reponse.results ?? (reponse as unknown as Destination[])),
    });
  }

  rechercher(): void {
    this.chargement = true;
    this.rechercheEffectuee = true;
    this.voyageService.rechercherVoyages({ depart: this.depart, arrivee: this.arrivee, date: this.date }).subscribe({
      next: (reponse) => {
        this.resultats = reponse.results ?? (reponse as unknown as Voyage[]);
        this.chargement = false;
      },
      error: () => (this.chargement = false),
    });
  }

  choisirVoyage(voyage: Voyage, tarifId: number): void {
    this.router.navigate(['/voyages', voyage.id, 'sieges'], { queryParams: { tarif: tarifId } });
  }
}
