import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogueAdminService } from '../../../core/services/catalogue-admin.service';
import { VoyageAdmin, Trajet, Bus, Classe } from '../../../core/models/models';

@Component({
  selector: 'app-admin-voyages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voyages.html',
})
export class Voyages implements OnInit {
  private service = inject(CatalogueAdminService);

  voyages: VoyageAdmin[] = [];
  trajets: Trajet[] = [];
  busListe: Bus[] = [];
  classes: Classe[] = [];
  chargement = true;
  erreur = '';

  /** Un seul tarif par voyage (la classe vient du bus assigné). */
  voyageSelectionnePourTarif: VoyageAdmin | null = null;
  formulaireTarif = { prix_adulte: 0, prix_enfant: 0 };

  formulaireVoyage = {
    trajet: null as number | null,
    bus: null as number | null,
    date: '',
    heure: '08:00',
  };

  ngOnInit(): void {
    this.service.listerTrajets().subscribe({ next: (r) => (this.trajets = Array.isArray(r) ? r : r.results) });
    this.service.listerBus().subscribe({ next: (r) => (this.busListe = Array.isArray(r) ? r : r.results) });
    this.service.listerClasses().subscribe({ next: (r) => (this.classes = Array.isArray(r) ? r : r.results) });
    this.charger();
  }

  private charger(): void {
    this.chargement = true;
    this.service.listerVoyages().subscribe({
      next: (r) => {
        this.voyages = Array.isArray(r) ? r : r.results;
        this.chargement = false;
      },
      error: () => (this.chargement = false),
    });
  }

  nomTrajet(id: number): string {
    const t = this.trajets.find((tr) => tr.id === id);
    return t ? `${t.depart.ville} → ${t.arrivee.ville}` : `#${id}`;
  }

  immatriculationBus(id: number): string {
    return this.busListe.find((b) => b.id === id)?.immatriculation ?? `#${id}`;
  }

  nomClasse(id: number): string {
    return this.classes.find((c) => c.id === id)?.nom ?? `#${id}`;
  }

  creerVoyage(): void {
    if (!this.formulaireVoyage.trajet || !this.formulaireVoyage.bus || !this.formulaireVoyage.date) return;
    this.erreur = '';
    const dateHeure = `${this.formulaireVoyage.date}T${this.formulaireVoyage.heure}:00`;

    this.service
      .creerVoyage({ trajet: this.formulaireVoyage.trajet, bus: this.formulaireVoyage.bus, date_heure_depart: dateHeure })
      .subscribe({
        next: () => {
          this.charger();
          this.formulaireVoyage = { trajet: null, bus: null, date: '', heure: '08:00' };
        },
        error: () => (this.erreur = 'Impossible de programmer ce voyage.'),
      });
  }

  supprimerVoyage(voyage: VoyageAdmin): void {
    if (!confirm('Supprimer ce voyage ?')) return;
    this.service.supprimerVoyage(voyage.id).subscribe({ next: () => this.charger() });
  }

  ouvrirTarif(voyage: VoyageAdmin): void {
    this.voyageSelectionnePourTarif = voyage;
    this.formulaireTarif = voyage.tarif
      ? { prix_adulte: Number(voyage.tarif.prix_adulte), prix_enfant: Number(voyage.tarif.prix_enfant) }
      : { prix_adulte: 0, prix_enfant: 0 };
  }

  enregistrerTarif(): void {
    if (!this.voyageSelectionnePourTarif) return;
    const voyage = this.voyageSelectionnePourTarif;
    const requete = voyage.tarif
      ? this.service.modifierTarif(voyage.tarif.id, this.formulaireTarif)
      : this.service.creerTarif({ voyage: voyage.id, ...this.formulaireTarif });

    requete.subscribe({
      next: () => {
        this.charger();
        this.voyageSelectionnePourTarif = null;
      },
      error: () => (this.erreur = "Impossible d'enregistrer ce tarif."),
    });
  }
}
