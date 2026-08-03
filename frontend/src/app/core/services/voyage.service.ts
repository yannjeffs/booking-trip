import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Destination, Classe, Voyage, PlanSieges } from '../models/models';

@Injectable({ providedIn: 'root' })
export class VoyageService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getDestinations(): Observable<{ results: Destination[] }> {
    return this.http.get<{ results: Destination[] }>(`${this.base}/destinations/`);
  }

  getClasses(): Observable<{ results: Classe[] }> {
    return this.http.get<{ results: Classe[] }>(`${this.base}/classes/`);
  }

  rechercherVoyages(filtres: {
    depart?: string;
    arrivee?: string;
    date?: string;
    classe?: number;
  }): Observable<{ results: Voyage[] }> {
    let params = new HttpParams();
    Object.entries(filtres).forEach(([cle, valeur]) => {
      if (valeur !== undefined && valeur !== null && valeur !== '') {
        params = params.set(cle, String(valeur));
      }
    });
    return this.http.get<{ results: Voyage[] }>(`${this.base}/voyages/`, { params });
  }

  getPlanSieges(voyageId: number): Observable<PlanSieges> {
    return this.http.get<PlanSieges>(`${this.base}/voyages/${voyageId}/sieges/`);
  }
}
