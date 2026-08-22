import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as QRCode from 'qrcode';
import { ReservationService } from '../../core/services/reservation.service';
import { Reservation } from '../../core/models/models';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmation.html',
})
export class Confirmation implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private reservationService = inject(ReservationService);
  private router = inject(Router);

  @ViewChild('qrCanvasAller') qrCanvasAller?: ElementRef<HTMLCanvasElement>;
  @ViewChild('qrCanvasRetour') qrCanvasRetour?: ElementRef<HTMLCanvasElement>;

  code = '';
  reservation: Reservation | null = null;
  verificationEnCours = false;

  private intervalId?: ReturnType<typeof setInterval>;
  private tentatives = 0;
  private readonly MAX_TENTATIVES = 10; // ~30s de rafraîchissement (le webhook CinetPay arrive généralement en quelques secondes)

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code') ?? '';
    this.charger();
  }

  ngAfterViewInit(): void {
    if (this.reservation) this.dessinerQr();
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private charger(): void {
    this.reservationService.rechercherParCode(this.code).subscribe({
      next: (r) => {
        this.reservation = r;
        setTimeout(() => this.dessinerQr(), 0);

        // Si on revient tout juste de CinetPay, le webhook peut prendre quelques
        // secondes à arriver : on réinterroge automatiquement le statut.
        if (r.statut === 'en_attente_paiement' && !this.intervalId) {
          this.verificationEnCours = true;
          this.intervalId = setInterval(() => this.reverifier(), 3000);
        }
      },
    });
  }

  private reverifier(): void {
    this.tentatives++;
    this.reservationService.rechercherParCode(this.code).subscribe({
      next: (r) => {
        this.reservation = r;
        if (r.statut === 'confirmee') {
          this.verificationEnCours = false;
          clearInterval(this.intervalId);
          setTimeout(() => this.dessinerQr(), 0);
        } else if (this.tentatives >= this.MAX_TENTATIVES) {
          this.verificationEnCours = false;
          clearInterval(this.intervalId);
        }
      },
    });
  }

  private dessinerQr(): void {
    if (this.qrCanvasAller && this.reservation?.qr_token) {
      QRCode.toCanvas(this.qrCanvasAller.nativeElement, this.reservation.qr_token, { width: 150, margin: 1 });
    }
    if (this.qrCanvasRetour && this.reservation?.reservation_retour?.qr_token) {
      QRCode.toCanvas(this.qrCanvasRetour.nativeElement, this.reservation.reservation_retour.qr_token, { width: 150, margin: 1 });
    }
  }

  allerPayer(): void {
    this.router.navigate(['/paiement', this.code]);
  }
}