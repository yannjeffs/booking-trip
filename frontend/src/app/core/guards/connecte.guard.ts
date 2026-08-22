import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protège les pages client (ex. Mes réservations) — n'importe quel compte connecté suffit. */
export const connecteGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estConnecte()) return true;

  router.navigate(['/connexion'], { queryParams: { retour: state.url } });
  return false;
};