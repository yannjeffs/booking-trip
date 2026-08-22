import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header-public',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header-public.html',
})
export class HeaderPublic {
  auth = inject(AuthService);

  deconnexion(): void {
    this.auth.deconnexion();
  }
}