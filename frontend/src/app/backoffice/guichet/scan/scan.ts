// backoffice/guichet/scan/scan.ts
import { Component, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GuichetService } from '../../../core/services/guichet.service';
import { Reservation } from '../../../core/models/models';

@Component({
  selector: 'app-guichet-scan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scan.html',
})
export class Scan {
  private guichetService = inject(GuichetService);

  @ViewChild('champCode') champCode?: ElementRef<HTMLInputElement>;

  code = '';
  resultat: { valide: boolean; motif?: string; reservation?: Reservation } | null = null;
  chargement = false;

  valider(): void {
    if (!this.code.trim()) return;
    this.chargement = true;
    this.resultat = null;

    this.guichetService.scanner({ code: this.code.trim() }).subscribe({
      next: (r) => { this.resultat = r; this.chargement = false; this.reinitialiser(); },
      error: (err) => {
        this.resultat = err?.error ?? { valide: false, motif: 'Erreur inattendue.' };
        this.chargement = false;
        this.reinitialiser();
      },
    });
  }

  private reinitialiser(): void {
    this.code = '';
    setTimeout(() => this.champCode?.nativeElement.focus(), 0);
  }
}
