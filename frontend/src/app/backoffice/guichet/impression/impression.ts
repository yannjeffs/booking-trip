import { Component, OnInit, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { ReservationService } from '../../../core/services/reservation.service';
import { Reservation } from '../../../core/models/models';

@Component({
  selector: 'app-guichet-impression',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './impression.html',
})
export class Impression implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private reservationService = inject(ReservationService);

  @ViewChild('qrAller') qrAller?: ElementRef<HTMLCanvasElement>;
  @ViewChild('qrRetour') qrRetour?: ElementRef<HTMLCanvasElement>;

  reservation: Reservation | null = null;

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.reservationService.rechercherParCode(code).subscribe({
      next: (r) => {
        this.reservation = r;
        setTimeout(() => {
          this.dessinerQr();
          window.print();
        }, 150);
      },
    });
  }

  ngAfterViewInit(): void {
    if (this.reservation) this.dessinerQr();
  }

  private dessinerQr(): void {
    if (this.qrAller && this.reservation?.qr_token) {
      QRCode.toCanvas(this.qrAller.nativeElement, this.reservation.qr_token, { width: 130, margin: 1 });
    }
    if (this.qrRetour && this.reservation?.reservation_retour?.qr_token) {
      QRCode.toCanvas(this.qrRetour.nativeElement, this.reservation.reservation_retour.qr_token, { width: 130, margin: 1 });
    }
  }

  imprimer(): void {
    window.print();
  }
}
