import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VoyageService } from '../../../core/services/voyage.service';
import { GuichetService, ModePaiementGuichet } from '../../../core/services/guichet.service';
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
  private router = inject(Router);

  clientNom = '';
  clientPrenom = '';
  clientTelephone = '';
  type: TypeBillet = 'aller_simple';

  voyages: Voyage[] = [];
  voyageSelectionne: Voyage | null = null;
  siegesAller: Siege[] = [];
  siegesAllerSelectionnes: string[] = [];

  voyagesRetour: Voyage[] = [];
  voyageRetourSelectionne: Voyage | null = null;
  siegesRetour: Siege[] = [];
  siegesRetourSelectionnes: string[] = [];

  payerMaintenant = true;
  modePaiement: ModePaiementGuichet = 'especes';

  chargementVoyages = false;
  chargementSieges = false;
  envoiEnCours = false;
  erreur = '';
  resultat: Reservation | null = null;

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
    this.resultat = null;
    this.chargementSieges = true;
    this.voyageService.getPlanSieges(voyage.id).subscribe({
      next: (r) => { this.siegesAller = r.colonnes.flatMap((colonne) => colonne.sieges); this.chargementSieges = false; },
      error: () => (this.chargementSieges = false),
    });

    if (this.type === 'aller_retour') {
      this.voyageService.rechercherVoyages({ depart: voyage.trajet.arrivee.ville, arrivee: voyage.trajet.depart.ville }).subscribe({
        next: (r) => (this.voyagesRetour = (r.results ?? (r as unknown as Voyage[])).filter((v) => v.date_heure_depart > voyage.date_heure_depart)),
      });
    }
  }

  choisirVoyageRetour(voyage: Voyage): void {
    this.voyageRetourSelectionne = voyage;
    this.siegesRetourSelectionnes = [];
    this.voyageService.getPlanSieges(voyage.id).subscribe({ next: (r) => (this.siegesRetour = r.colonnes.flatMap((colonne) => colonne.sieges)) });
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

  get pretAValider(): boolean {
    if (!this.clientNom.trim() || !this.clientPrenom.trim() || !this.clientTelephone.trim()) return false;
    if (this.siegesAllerSelectionnes.length === 0) return false;
    if (this.type === 'aller_retour' && this.siegesRetourSelectionnes.length !== this.siegesAllerSelectionnes.length) return false;
    return true;
  }

  valider(): void {
    if (!this.voyageSelectionne || !this.pretAValider) return;
    this.envoiEnCours = true;
    this.erreur = '';

    const nomComplet = `${this.clientPrenom} ${this.clientNom}`;
    const passagers: PassagerInput[] = this.siegesAllerSelectionnes.map((siege, i) => ({
      nom: this.siegesAllerSelectionnes.length === 1 ? nomComplet : `Passager ${i + 1}`,
      age: null,
      siege,
    }));

    this.guichetService
      .vendre({
        client_nom: this.clientNom,
        client_prenom: this.clientPrenom,
        client_telephone: this.clientTelephone,
        voyage: this.voyageSelectionne.id,
        passagers,
        type_billet: this.type,
        payer_maintenant: this.payerMaintenant,
        ...(this.payerMaintenant ? { mode_paiement: this.modePaiement } : {}),
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
          this.resultat = reservation;
          if (this.payerMaintenant) {
            window.open(`/backoffice/guichet/impression/${reservation.code_alphanumerique}`, '_blank');
          }
          this.reinitialiser();
        },
        error: (err) => {
          this.envoiEnCours = false;
          this.erreur = err?.error?.mode_paiement?.[0] ?? err?.error?.non_field_errors?.[0] ?? err?.error?.detail ?? 'La demande a échoué.';
        },
      });
  }

  private reinitialiser(): void {
    this.voyageSelectionne = null;
    this.voyageRetourSelectionne = null;
    this.siegesAllerSelectionnes = [];
    this.siegesRetourSelectionnes = [];
    this.clientNom = '';
    this.clientPrenom = '';
    this.clientTelephone = '';
  }

  ouvrirImpression(): void {
    if (this.resultat) window.open(`/backoffice/guichet/impression/${this.resultat.code_alphanumerique}`, '_blank');
  }
}
