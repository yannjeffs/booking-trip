import { Component, OnInit, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
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
export class Confirmation implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private reservationService = inject(ReservationService);
  private router = inject(Router);

  @ViewChild('qrCanvasAller') qrCanvasAller?: ElementRef<HTMLCanvasElement>;
  @ViewChild('qrCanvasRetour') qrCanvasRetour?: ElementRef<HTMLCanvasElement>;

  code = '';
  reservation: Reservation | null = null;

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code') ?? '';
    this.reservationService.rechercherParCode(this.code).subscribe({
      next: (r) => {
        this.reservation = r;
        setTimeout(() => this.dessinerQr(), 0);
      },
    });
  }

  ngAfterViewInit(): void {
    if (this.reservation) this.dessinerQr();
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
