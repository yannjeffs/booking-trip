import { Routes } from '@angular/router';
import { agentGuard } from './core/guards/agent.guard';
import { adminGuard } from './core/guards/admin.guard';
import { connecteGuard } from './core/guards/connecte.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'recherche', pathMatch: 'full' },
  {
    path: 'connexion',
    loadComponent: () => import('./features/auth/connexion/connexion').then((m) => m.ConnexionClient),
  },
  {
    path: 'inscription',
    loadComponent: () => import('./features/auth/inscription/inscription').then((m) => m.InscriptionClient),
  },
  {
    path: 'mes-reservations',
    canActivate: [connecteGuard],
    loadComponent: () => import('./features/mes-reservations/mes-reservations').then((m) => m.MesReservations),
  },
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
    path: 'backoffice/connexion',
    loadComponent: () => import('./backoffice/connexion/connexion').then((m) => m.Connexion),
  },
  {
    path: 'backoffice',
    loadComponent: () => import('./backoffice/layout/layout').then((m) => m.Layout),
    children: [
      { path: '', redirectTo: 'guichet/vente', pathMatch: 'full' },
      {
        path: 'guichet/vente',
        canActivate: [agentGuard],
        loadComponent: () => import('./backoffice/guichet/vente/vente').then((m) => m.Vente),
      },
      {
        path: 'guichet/scan',
        canActivate: [agentGuard],
        loadComponent: () => import('./backoffice/guichet/scan/scan').then((m) => m.Scan),
      },
      {
        path: 'guichet/impression/:code',
        canActivate: [agentGuard],
        loadComponent: () => import('./backoffice/guichet/impression/impression').then((m) => m.Impression),
      },
      { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
      {
        path: 'admin/dashboard',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./backoffice/admin/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'admin/destinations',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./backoffice/admin/destinations/destinations').then((m) => m.Destinations),
      },
      {
        path: 'admin/classes',
        canActivate: [adminGuard],
        loadComponent: () => import('./backoffice/admin/classes/classes').then((m) => m.Classes),
      },
      {
        path: 'admin/bus',
        canActivate: [adminGuard],
        loadComponent: () => import('./backoffice/admin/bus/bus').then((m) => m.Bus),
      },
      {
        path: 'admin/trajets',
        canActivate: [adminGuard],
        loadComponent: () => import('./backoffice/admin/trajets/trajets').then((m) => m.Trajets),
      },
      {
        path: 'admin/voyages',
        canActivate: [adminGuard],
        loadComponent: () => import('./backoffice/admin/voyages/voyages').then((m) => m.Voyages),
      },
    ],
  },

  { path: '**', redirectTo: 'recherche' },
];
