// connexion.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './connexion.html',
})
export class Connexion {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  erreur = '';
  chargement = false;

  seConnecter(): void {
    this.chargement = true;
    this.erreur = '';
    this.auth.connexion(this.username, this.password).subscribe({
      next: () => {
        this.chargement = false;
        this.router.navigate([this.auth.estAdmin() ? '/backoffice/admin' : '/backoffice/guichet']);
      },
      error: () => {
        this.chargement = false;
        this.erreur = 'Identifiants incorrects.';
      },
    });
  }
}
