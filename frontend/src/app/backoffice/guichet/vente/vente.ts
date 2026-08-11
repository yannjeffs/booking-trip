import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoyageService } from '../../../core/services/voyage.service';
import { GuichetService } from '../../../core/services/guichet.service';
import { Voyage, Siege, PassagerInput, Reservation, TypeBillet } from '../../../core/models/models';

@Component({
  selector: 'app-guichet-vente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vente.html',
})
export class Vente implements OnInit {
  private voyageService = inject(VoyageService);
  private guichetService = inject(GuichetService);

  type: TypeBillet = 'aller_simple';
  clientNom = '';
  clientTelephone = '';

  voyages: Voyage[] = [];
  voyageSelectionne: Voyage | null = null;
  siegesAller: Siege[] = [];
  siegesAllerSelectionnes: string[] = [];

  voyagesRetour: Voyage[] = [];
  voyageRetourSelectionne: Voyage | null = null;
  siegesRetour: Siege[] = [];
  siegesRetourSelectionnes: string[] = [];

  chargementVoyages = false;
  chargementSieges = false;
  envoiEnCours = false;
  erreur = '';
  billetVendu: Reservation | null = null;

  ngOnInit(): void {
    this.chargerVoyages();
  }

  private chargerVoyages(): void {
    this.chargementVoyages = true;
    this.voyageService.rechercherVoyages({}).subscribe({
      next: (r) => {
        this.voyages = r.results ?? (r as unknown as Voyage[]);
        this.chargementVoyages = false;
      },
      error: () => (this.chargementVoyages = false),
    });
  }

  choisirVoyage(voyage: Voyage): void {
    this.voyageSelectionne = voyage;
    this.siegesAllerSelectionnes = [];
    this.billetVendu = null;
    this.chargementSieges = true;
    this.voyageService.getPlanSieges(voyage.id).subscribe({
      next: (r) => { this.siegesAller = r.sieges; this.chargementSieges = false; },
      error: () => (this.chargementSieges = false),
    });

    if (this.type === 'aller_retour') {
      // Propose les voyages retour sur le trajet inverse
      this.voyageService.rechercherVoyages({ depart: voyage.trajet.arrivee.ville, arrivee: voyage.trajet.depart.ville }).subscribe({
        next: (r) => (this.voyagesRetour = (r.results ?? (r as unknown as Voyage[])).filter((v) => v.date_heure_depart > voyage.date_heure_depart)),
      });
    }
  }

  choisirVoyageRetour(voyage: Voyage): void {
    this.voyageRetourSelectionne = voyage;
    this.siegesRetourSelectionnes = [];
    this.voyageService.getPlanSieges(voyage.id).subscribe({ next: (r) => (this.siegesRetour = r.sieges) });
  }

  basculerSiegeAller(siege: Siege): void {
    if (siege.statut === 'occupe') return;
    const i = this.siegesAllerSelectionnes.indexOf(siege.numero);
    if (i >= 0) this.siegesAllerSelectionnes.splice(i, 1);
    else this.siegesAllerSelectionnes.push(siege.numero);
  }

  basculerSiegeRetour(siege: Siege): void {
    if (siege.statut === 'occupe') return;
    const i = this.siegesRetourSelectionnes.indexOf(siege.numero);
    if (i >= 0) this.siegesRetourSelectionnes.splice(i, 1);
    else this.siegesRetourSelectionnes.push(siege.numero);
  }

  get pretAVendre(): boolean {
    if (!this.clientNom.trim() || !this.clientTelephone.trim()) return false;
    if (this.siegesAllerSelectionnes.length === 0) return false;
    if (this.type === 'aller_retour') {
      return !!this.voyageRetourSelectionne && this.siegesRetourSelectionnes.length === this.siegesAllerSelectionnes.length;
    }
    return true;
  }

  vendre(): void {
    if (!this.voyageSelectionne || !this.pretAVendre) return;
    this.envoiEnCours = true;
    this.erreur = '';

    const passagers: PassagerInput[] = this.siegesAllerSelectionnes.map((siege, i) => ({
      nom: this.siegesAllerSelectionnes.length === 1 ? this.clientNom : `Passager ${i + 1}`,
      age: null,
      siege,
    }));

    this.guichetService
      .vendre({
        client_nom: this.clientNom,
        client_telephone: this.clientTelephone,
        voyage: this.voyageSelectionne.id,
        passagers,
        type_billet: this.type,
        ...(this.type === 'aller_retour' && this.voyageRetourSelectionne
          ? {
              voyage_retour: this.voyageRetourSelectionne.id,
              passagers_retour: this.siegesRetourSelectionnes.map((siege, i) => ({ nom: passagers[i]?.nom ?? `Passager ${i + 1}`, age: null, siege })),
            }
          : {}),
      })
      .subscribe({
        next: (reservation) => {
          this.envoiEnCours = false;
          this.billetVendu = reservation;
          this.voyageSelectionne = null;
          this.voyageRetourSelectionne = null;
          this.siegesAllerSelectionnes = [];
          this.siegesRetourSelectionnes = [];
          this.clientNom = '';
          this.clientTelephone = '';
        },
        error: (err) => {
          this.envoiEnCours = false;
          this.erreur = err?.error?.detail ?? err?.error?.non_field_errors?.[0] ?? 'La vente a échoué.';
        },
      });
  }
}
