import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-connexion-client',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './connexion.html',
})
export class ConnexionClient {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  telephone = '';
  password = '';
  erreur = '';
  chargement = false;

  seConnecter(): void {
    this.chargement = true;
    this.erreur = '';
    this.auth.connexion(this.telephone, this.password).subscribe({
      next: () => {
        this.chargement = false;
        const retour = this.route.snapshot.queryParamMap.get('retour') ?? '/mes-reservations';
        this.router.navigateByUrl(retour);
      },
      error: () => {
        this.chargement = false;
        this.erreur = 'Numéro ou mot de passe incorrect.';
      },
    });
  }
}