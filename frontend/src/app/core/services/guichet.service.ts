import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PassagerInput, Reservation, TypeBillet } from '../models/models';

export interface VenteGuichetPayload {
  client_nom: string;
  client_telephone: string;
  voyage: number;
  passagers: PassagerInput[];
  type_billet: TypeBillet;
  voyage_retour?: number;
  passagers_retour?: PassagerInput[];
}

@Injectable({ providedIn: 'root' })
export class GuichetService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  vendre(payload: VenteGuichetPayload): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/guichet/reservations/`, payload);
  }

  scanner(codeOuQr: { code?: string; qr_token?: string }): Observable<{ valide: boolean; motif?: string; reservation?: Reservation }> {
    return this.http.post<{ valide: boolean; motif?: string; reservation?: Reservation }>(
      `${this.base}/guichet/tickets/scan/`,
      codeOuQr
    );
  }
}
