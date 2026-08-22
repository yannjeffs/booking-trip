import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReservationService } from '../../core/services/reservation.service';
import { Reservation } from '../../core/models/models';
import { HeaderPublic } from "../../shared/header-public/header-public";

@Component({
  selector: 'app-mes-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderPublic],
  templateUrl: './mes-reservations.html',
})
export class MesReservations implements OnInit {
  private reservationService = inject(ReservationService);
  reservations: Reservation[] = [];
  chargement = true;

  ngOnInit(): void {
    this.reservationService.mesReservations().subscribe({
      next: (reponse) => {
        this.reservations = reponse.results ?? (reponse as unknown as Reservation[]);
        this.chargement = false;
      },
      error: () => (this.chargement = false),
    });
  }

  classeStatut(statut: string): string {
    switch (statut) {
      case 'confirmee': return 'bg-green-100 text-green-700';
      case 'en_attente_paiement': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  }

  libelleStatut(statut: string): string {
    switch (statut) {
      case 'confirmee': return 'Confirmé';
      case 'en_attente_paiement': return 'En attente de paiement';
      case 'annulee': return 'Annulé';
      case 'expiree': return 'Expiré';
      default: return statut;
    }
  }
}
