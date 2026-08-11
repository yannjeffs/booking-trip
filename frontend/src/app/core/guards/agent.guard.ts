// agent.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const agentGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estConnecte() && (auth.estAgent() || auth.estAdmin())) return true;

  router.navigate(['/backoffice/connexion']);
  return false;
};
