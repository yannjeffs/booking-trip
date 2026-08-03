import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreerReservationPayload, Reservation } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  creer(payload: CreerReservationPayload): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/reservations/`, payload);
  }

  payer(code: string, provider: string, numeroTelephone: string): Observable<{ paiement_id: number; statut: string; detail: string }> {
    return this.http.post<{ paiement_id: number; statut: string; detail: string }>(
      `${this.base}/reservations/${code}/payer/`,
      { provider, numero_telephone: numeroTelephone }
    );
  }

  rechercherParCode(code: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.base}/tickets/lookup/`, { params: { code } });
  }

  rechercherParQr(qrToken: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.base}/tickets/lookup/`, { params: { qr_token: qrToken } });
  }

  mesReservations(): Observable<{ results: Reservation[] }> {
    return this.http.get<{ results: Reservation[] }>(`${this.base}/reservations/mes-reservations/`);
  }
}
