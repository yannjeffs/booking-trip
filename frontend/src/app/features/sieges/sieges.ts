import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VoyageService } from '../../core/services/voyage.service';
import { ReservationService } from '../../core/services/reservation.service';
import { AuthService } from '../../core/services/auth.service';
import { Siege, PassagerInput, TypeBillet, ProgrammeFidelite } from '../../core/models/models';

@Component({
  selector: 'app-sieges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sieges.html',
})
export class Sieges implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private voyageService = inject(VoyageService);
  private reservationService = inject(ReservationService);
  private auth = inject(AuthService);

  voyageId!: number;
  voyageRetourId: number | null = null;
  type: TypeBillet = 'aller_simple';

  siegesAller: Siege[] = [];
  siegesAllerSelectionnes: string[] = [];
  siegesRetour: Siege[] = [];
  siegesRetourSelectionnes: string[] = [];

  chargement = true;
  envoiEnCours = false;
  erreur = '';

  /** false = "je réserve, je paie plus tard" ; true = "j'achète tout de suite" */
  payerMaintenant = true;

  fidelite: ProgrammeFidelite | null = null;
  utiliserCreditFidelite = false;

  ngOnInit(): void {
    this.voyageId = Number(this.route.snapshot.paramMap.get('id'));
    this.type = (this.route.snapshot.queryParamMap.get('type') as TypeBillet) ?? 'aller_simple';
    const retour = this.route.snapshot.queryParamMap.get('retour');
    this.voyageRetourId = retour ? Number(retour) : null;

    this.voyageService.getPlanSieges(this.voyageId).subscribe({
      next: (reponse) => {
        this.siegesAller = reponse.sieges;
        if (this.voyageRetourId) {
          this.voyageService.getPlanSieges(this.voyageRetourId).subscribe({
            next: (r2) => { this.siegesRetour = r2.sieges; this.chargement = false; },
            error: () => (this.chargement = false),
          });
        } else {
          this.chargement = false;
        }
      },
      error: () => (this.chargement = false),
    });

    if (this.auth.estConnecte()) {
      this.reservationService.maFidelite().subscribe({ next: (f) => (this.fidelite = f) });
    }
  }

  get creditDisponible(): number {
    if (!this.fidelite) return 0;
    return this.type === 'aller_simple' ? this.fidelite.credits_aller_simple : this.fidelite.credits_aller_retour;
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

  get pretAContinuer(): boolean {
    if (this.siegesAllerSelectionnes.length === 0) return false;
    if (this.type === 'aller_retour') {
      return this.siegesRetourSelectionnes.length === this.siegesAllerSelectionnes.length;
    }
    return true;
  }

  private construireNomPassager(index: number): string {
    if (this.siegesAllerSelectionnes.length === 1 && this.auth.estConnecte()) {
      const u = this.auth.utilisateur();
      return u ? `${u.first_name} ${u.last_name}`.trim() : 'Passager';
    }
    return `Passager ${index + 1}`;
  }

  continuer(): void {
    if (!this.pretAContinuer) return;
    this.envoiEnCours = true;
    this.erreur = '';

    const passagers: PassagerInput[] = this.siegesAllerSelectionnes.map((siege, i) => ({
      nom: this.construireNomPassager(i),
      age: null,
      siege,
    }));

    const payload: Parameters<ReservationService['creer']>[0] = {
      voyage: this.voyageId,
      passagers,
      payer_maintenant: this.payerMaintenant,
      type_billet: this.type,
      utiliser_credit_fidelite: this.utiliserCreditFidelite,
    };

    if (this.type === 'aller_retour' && this.voyageRetourId) {
      payload.voyage_retour = this.voyageRetourId;
      payload.passagers_retour = this.siegesRetourSelectionnes.map((siege, i) => ({
        nom: passagers[i]?.nom ?? `Passager ${i + 1}`,
        age: null,
        siege,
      }));
    }

    this.reservationService.creer(payload).subscribe({
      next: (reservation) => {
        this.envoiEnCours = false;
        if (reservation.statut === 'confirmee') {
          this.router.navigate(['/tickets', reservation.code_alphanumerique]);
        } else if (this.payerMaintenant) {
          this.router.navigate(['/paiement', reservation.code_alphanumerique]);
        } else {
          this.router.navigate(['/tickets', reservation.code_alphanumerique]);
        }
      },
      error: (err) => {
        this.envoiEnCours = false;
        this.erreur = err?.error?.non_field_errors?.[0] ?? err?.error?.detail ?? 'Une erreur est survenue, merci de réessayer.';
      },
    });
  }
}
