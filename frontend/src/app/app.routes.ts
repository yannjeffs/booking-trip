import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'recherche', pathMatch: 'full' },
  {
    path: 'recherche',
    loadComponent: () => import('./features/recherche/recherche').then((m) => m.Recherche),
  },
  {
    path: 'voyages/:id/sieges',
    loadComponent: () => import('./features/sieges/sieges').then((m) => m.Sieges),
  },
  {
    path: 'paiement/:code',
    loadComponent: () => import('./features/paiement/paiement').then((m) => m.Paiement),
  },
  {
    path: 'tickets/:code',
    loadComponent: () => import('./features/confirmation/confirmation').then((m) => m.Confirmation),
  },
  {
    path: 'mes-reservations',
    loadComponent: () => import('./features/mes-reservations/mes-reservations').then((m) => m.MesReservations),
  },
  { path: '**', redirectTo: 'recherche' },
];
