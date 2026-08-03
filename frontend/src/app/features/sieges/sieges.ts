import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VoyageService } from '../../core/services/voyage.service';
import { ReservationService } from '../../core/services/reservation.service';
import { Siege, PassagerInput } from '../../core/models/models';

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

  voyageId!: number;
  tarifId!: number;
  sieges: Siege[] = [];
  siegesSelectionnes: string[] = [];
  chargement = true;
  envoiEnCours = false;
  erreur = '';

  ngOnInit(): void {
    this.voyageId = Number(this.route.snapshot.paramMap.get('id'));
    this.tarifId = Number(this.route.snapshot.queryParamMap.get('tarif'));

    this.voyageService.getPlanSieges(this.voyageId).subscribe({
      next: (reponse) => {
        this.sieges = reponse.sieges;
        this.chargement = false;
      },
      error: () => (this.chargement = false),
    });
  }

  basculerSiege(siege: Siege): void {
    if (siege.statut === 'occupe') return;
    const index = this.siegesSelectionnes.indexOf(siege.numero);
    if (index >= 0) {
      this.siegesSelectionnes.splice(index, 1);
    } else {
      this.siegesSelectionnes.push(siege.numero);
    }
  }

  estSelectionne(numero: string): boolean {
    return this.siegesSelectionnes.includes(numero);
  }

  continuer(): void {
    if (this.siegesSelectionnes.length === 0) return;
    this.envoiEnCours = true;
    this.erreur = '';

    const passagers: PassagerInput[] = this.siegesSelectionnes.map((siege) => ({
      nom: 'Passager', // à remplacer par un formulaire nom/âge par passager si besoin
      age: null,
      siege,
    }));

    this.reservationService
      .creer({ voyage: this.voyageId, tarif: this.tarifId, passagers, payer_maintenant: true })
      .subscribe({
        next: (reservation) => {
          this.envoiEnCours = false;
          this.router.navigate(['/paiement', reservation.code_alphanumerique]);
        },
        error: (err) => {
          this.envoiEnCours = false;
          this.erreur = err?.error?.detail ?? 'Une erreur est survenue, merci de réessayer.';
        },
      });
  }
}
