import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Attache le token JWT à chaque requête vers l'API, et tente un refresh
 * automatique une fois en cas de 401 avant de déconnecter l'utilisateur.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  const requete = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(requete).pipe(
    catchError((erreur: HttpErrorResponse) => {
      const estRequeteAuth = req.url.includes('/auth/token/');
      if (erreur.status === 401 && auth.getRefreshToken() && !estRequeteAuth) {
        return auth.rafraichirToken().pipe(
          switchMap((reponse) => {
            const requeteRelancee = req.clone({ setHeaders: { Authorization: `Bearer ${reponse.access}` } });
            return next(requeteRelancee);
          }),
          catchError((erreurRefresh) => {
            auth.deconnexion();
            return throwError(() => erreurRefresh);
          })
        );
      }
      return throwError(() => erreur);
    })
  );
};
