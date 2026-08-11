// backoffice/admin/classes/classes.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogueAdminService } from '../../../core/services/catalogue-admin.service';
import { Classe } from '../../../core/models/models';

@Component({
  selector: 'app-admin-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classes.html',
})
export class Classes implements OnInit {
  private service = inject(CatalogueAdminService);
  classes: Classe[] = [];
  chargement = true;
  enEdition: Classe | null = null;
  formulaire = { nom: '', description: '' };
  erreur = '';

  ngOnInit(): void { this.charger(); }

  private charger(): void {
    this.chargement = true;
    this.service.listerClasses().subscribe({
      next: (r) => { this.classes = Array.isArray(r) ? r : r.results; this.chargement = false; },
      error: () => (this.chargement = false),
    });
  }

  ouvrirCreation(): void { this.enEdition = null; this.formulaire = { nom: '', description: '' }; }
  ouvrirEdition(classe: Classe): void { this.enEdition = classe; this.formulaire = { nom: classe.nom, description: classe.description }; }

  enregistrer(): void {
    this.erreur = '';
    const requete = this.enEdition ? this.service.modifierClasse(this.enEdition.id, this.formulaire) : this.service.creerClasse(this.formulaire);
    requete.subscribe({ next: () => { this.charger(); this.ouvrirCreation(); }, error: () => (this.erreur = "Impossible d'enregistrer cette classe.") });
  }

  supprimer(classe: Classe): void {
    if (!confirm(`Supprimer la classe ${classe.nom} ?`)) return;
    this.service.supprimerClasse(classe.id).subscribe({ next: () => this.charger() });
  }
}
