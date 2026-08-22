import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservationService } from '../../core/services/reservation.service';
import { Reservation } from '../../core/models/models';

@Component({
  selector: 'app-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiement.html',
})
export class Paiement implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reservationService = inject(ReservationService);

  code = '';
  reservation: Reservation | null = null;
  provider: 'orange_money' | 'mtn_momo' | 'carte_bancaire' = 'orange_money';
  numeroTelephone = '';
  envoiEnCours = false;
  erreur = '';

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code') ?? '';
    this.reservationService.rechercherParCode(this.code).subscribe({
      next: (r) => (this.reservation = r),
    });
  }

  payer(): void {
    this.erreur = '';
    this.envoiEnCours = true;
    this.reservationService.payer(this.code, this.provider, this.numeroTelephone).subscribe({
      next: (response) => {
        window.location.href = response.paiement_url; // page de paiement sécurisé de CinetPay
      },
      error: (err) => {
        this.envoiEnCours = false;
        this.erreur = err?.error?.detail ?? 'Le paiement a échoué. Veuillez réessayer plus tard.';
      }
    });
  }
}