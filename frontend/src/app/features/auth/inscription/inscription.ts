import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-inscription-client',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inscription.html',
})
export class InscriptionClient {
  private auth = inject(AuthService);
  private router = inject(Router);

  nom = '';
  prenom = '';
  telephone = '';
  password = '';
  erreur = '';
  chargement = false;

  sInscrire(): void {
    this.chargement = true;
    this.erreur = '';
    this.auth
      .inscription({ telephone: this.telephone, password: this.password, first_name: this.prenom, last_name: this.nom })
      .subscribe({
        next: () => {
          this.chargement = false;
          this.router.navigate(['/mes-reservations']);
        },
        error: (err) => {
          this.chargement = false;
          this.erreur = err?.error?.telephone?.[0] ?? err?.error?.password?.[0] ?? "Inscription impossible, vérifiez vos informations.";
        },
      });
  }
}