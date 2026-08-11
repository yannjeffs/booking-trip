import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Destination, Classe, Bus, Trajet, VoyageAdmin, DashboardStats } from '../models/models';

type Liste<T> = { results: T[] } | T[];

@Injectable({ providedIn: 'root' })
export class CatalogueAdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  // --- Destinations ---
  listerDestinations(): Observable<Liste<Destination>> {
    return this.http.get<Liste<Destination>>(`${this.base}/destinations/`);
  }
  creerDestination(data: Partial<Destination>): Observable<Destination> {
    return this.http.post<Destination>(`${this.base}/destinations/`, data);
  }
  modifierDestination(id: number, data: Partial<Destination>): Observable<Destination> {
    return this.http.patch<Destination>(`${this.base}/destinations/${id}/`, data);
  }
  supprimerDestination(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/destinations/${id}/`);
  }

  // --- Classes ---
  listerClasses(): Observable<Liste<Classe>> {
    return this.http.get<Liste<Classe>>(`${this.base}/classes/`);
  }
  creerClasse(data: Partial<Classe>): Observable<Classe> {
    return this.http.post<Classe>(`${this.base}/classes/`, data);
  }
  modifierClasse(id: number, data: Partial<Classe>): Observable<Classe> {
    return this.http.patch<Classe>(`${this.base}/classes/${id}/`, data);
  }
  supprimerClasse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/classes/${id}/`);
  }

  // --- Bus (un bus = une seule classe) ---
  listerBus(): Observable<Liste<Bus>> {
    return this.http.get<Liste<Bus>>(`${this.base}/bus/`);
  }
  creerBus(data: Partial<Bus>): Observable<Bus> {
    return this.http.post<Bus>(`${this.base}/bus/`, data);
  }
  modifierBus(id: number, data: Partial<Bus>): Observable<Bus> {
    return this.http.patch<Bus>(`${this.base}/bus/${id}/`, data);
  }
  supprimerBus(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/bus/${id}/`);
  }

  // --- Trajets ---
  listerTrajets(): Observable<Liste<Trajet>> {
    return this.http.get<Liste<Trajet>>(`${this.base}/trajets/`);
  }
  creerTrajet(data: { depart: number; arrivee: number; duree_estimee: string; distance_km?: number }): Observable<Trajet> {
    return this.http.post<Trajet>(`${this.base}/trajets/`, data);
  }
  supprimerTrajet(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/trajets/${id}/`);
  }

  // --- Voyages ---
  listerVoyages(): Observable<Liste<VoyageAdmin>> {
    return this.http.get<Liste<VoyageAdmin>>(`${this.base}/voyages/`);
  }
  creerVoyage(data: { trajet: number; bus: number; date_heure_depart: string }): Observable<VoyageAdmin> {
    return this.http.post<VoyageAdmin>(`${this.base}/voyages/`, data);
  }
  supprimerVoyage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/voyages/${id}/`);
  }

  // --- Tarifs (un seul par voyage, la classe vient du bus) ---
  creerTarif(data: { voyage: number; prix_adulte: number; prix_enfant: number }): Observable<unknown> {
    return this.http.post(`${this.base}/tarifs/`, data);
  }
  modifierTarif(id: number, data: { prix_adulte: number; prix_enfant: number }): Observable<unknown> {
    return this.http.patch(`${this.base}/tarifs/${id}/`, data);
  }
  supprimerTarif(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/tarifs/${id}/`);
  }

  // --- Dashboard ---
  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/dashboard/stats/`);
  }
}
