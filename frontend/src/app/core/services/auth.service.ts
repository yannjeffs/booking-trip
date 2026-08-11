import { inject, Injectable, signal } from "@angular/core";
import { Utilisateur } from "../models/models";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { Observable, tap } from "rxjs";

const CLE_ACCESS = 'cx_access_token';
const CLE_REFRESH = 'cx_refresh_token';
const CLE_UTILISATEUR = 'cx_utilisateur';

interface ReponseConnexion {
  access: string;
  refresh: string;
  utilisateur: Utilisateur;
}

@Injectable({ providedIn: 'root'})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = environment.apiUrl;

  utilisateur = signal<Utilisateur | null>(this.lireUtilisateurStocke());

  private lireUtilisateurStocke(): Utilisateur | null {
    const brut = localStorage.getItem(CLE_UTILISATEUR);
    return brut ? JSON.parse(brut) : null
  }

  connexion (username: string, password: string): Observable <ReponseConnexion> {
    return this.http.post<ReponseConnexion>(`${this.base}/auth/token/`, {username, password}).pipe(
      tap((response) => {
        localStorage.setItem(CLE_ACCESS, response.access),
        localStorage.setItem(CLE_REFRESH, response.refresh)
        localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(response.utilisateur));
        this.utilisateur.set(response.utilisateur);
      })
    )
  }

  rafraichirToken (): Observable <{ access: string }> {
    const refresh = localStorage.getItem(CLE_ACCESS);
   return this.http.post<{ access: string }>(`${this.base}/auth/token/refresh/`, { refresh }).pipe(
      tap((reponse) => localStorage.setItem(CLE_ACCESS, reponse.access))
    );
  }

  deconnexion(): void {
    localStorage.removeItem(CLE_ACCESS);
    localStorage.removeItem(CLE_REFRESH);
    localStorage.removeItem(CLE_UTILISATEUR);
    this.utilisateur.set(null);
    this.router.navigate(['/backoffice/navigate/connexion']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(CLE_ACCESS);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(CLE_REFRESH);
  }

  estConnecte(): boolean {
    return !!this.getAccessToken() && !!this.utilisateur();
  }

  estAgent(): boolean {
    return this.utilisateur()?.role === 'agent';
  }

  estAdmin(): boolean {
    return this.utilisateur()?.role === 'admin';
  }
}
