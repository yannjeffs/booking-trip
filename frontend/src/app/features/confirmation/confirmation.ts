import { Component, OnInit, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

  @ViewChild('qrCanvas') qrCanvas?: ElementRef<HTMLCanvasElement>;

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
    if (!this.qrCanvas || !this.reservation?.qr_token) return;
    QRCode.toCanvas(this.qrCanvas.nativeElement, this.reservation.qr_token, { width: 160, margin: 1 });
  }
}