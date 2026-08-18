import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogueAdminService } from '../../../core/services/catalogue-admin.service';
import { VoyageAdmin, Trajet, Bus, Classe, HoraireRecurrent, ResultatGeneration } from '../../../core/models/models';

@Component({
  selector: 'app-admin-voyages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voyages.html',
})
export class Voyages implements OnInit {
  private service = inject(CatalogueAdminService);

  trajets: Trajet[] = [];
  busListe: Bus[] = [];
  classes: Classe[] = [];

  // --- Horaires récurrents ---
  horaires: HoraireRecurrent[] = [];
  chargementHoraires = true;
  enEditionHoraire: HoraireRecurrent | null = null;
  formulaireHoraire = { trajet: null as number | null, classe: null as number | null, heure_depart: '06:00', prix_adulte: 0, prix_enfant: 0 };
  erreurHoraire = '';
  resultatGeneration: ResultatGeneration | null = null;
  generationEnCours = false;

  // --- Voyage ponctuel ---
  voyages: VoyageAdmin[] = [];
  chargementVoyages = true;
  erreurVoyage = '';
  voyageSelectionnePourTarif: VoyageAdmin | null = null;
  formulaireTarif = { prix_adulte: 0, prix_enfant: 0 };
  formulaireVoyage = { trajet: null as number | null, bus: null as number | null, date: '', heure: '08:00' };

  ngOnInit(): void {
    this.service.listerTrajets().subscribe({ next: (r) => (this.trajets = Array.isArray(r) ? r : r.results) });
    this.service.listerBus().subscribe({ next: (r) => (this.busListe = Array.isArray(r) ? r : r.results) });
    this.service.listerClasses().subscribe({ next: (r) => (this.classes = Array.isArray(r) ? r : r.results) });
    this.chargerHoraires();
    this.chargerVoyages();
  }

  nomTrajet(id: number): string {
    const t = this.trajets.find((tr) => tr.id === id);
    return t ? `${t.depart.ville} → ${t.arrivee.ville}` : `#${id}`;
  }

  nomClasse(id: number): string {
    return this.classes.find((c) => c.id === id)?.nom ?? `#${id}`;
  }

  immatriculationBus(id: number): string {
    return this.busListe.find((b) => b.id === id)?.immatriculation ?? `#${id}`;
  }

  // ===================== Horaires récurrents =====================

  private chargerHoraires(): void {
    this.chargementHoraires = true;
    this.service.listerHorairesRecurrents().subscribe({
      next: (r) => {
        this.horaires = Array.isArray(r) ? r : r.results;
        this.chargementHoraires = false;
      },
      error: () => (this.chargementHoraires = false),
    });
  }

  ouvrirCreationHoraire(): void {
    this.enEditionHoraire = null;
    this.formulaireHoraire = { trajet: null, classe: null, heure_depart: '06:00', prix_adulte: 0, prix_enfant: 0 };
  }

  ouvrirEditionHoraire(horaire: HoraireRecurrent): void {
    this.enEditionHoraire = horaire;
    this.formulaireHoraire = {
      trajet: horaire.trajet,
      classe: horaire.classe,
      heure_depart: horaire.heure_depart.slice(0, 5),
      prix_adulte: Number(horaire.prix_adulte),
      prix_enfant: Number(horaire.prix_enfant),
    };
  }

  enregistrerHoraire(): void {
    this.erreurHoraire = '';
    const heure = `${this.formulaireHoraire.heure_depart}:00`;

    if (this.enEditionHoraire) {
      // En édition, seuls heure et prix sont modifiables (trajet/classe fixent l'horaire).
      this.service
        .modifierHoraireRecurrent(this.enEditionHoraire.id, {
          heure_depart: heure,
          prix_adulte: this.formulaireHoraire.prix_adulte,
          prix_enfant: this.formulaireHoraire.prix_enfant,
        })
        .subscribe({
          next: () => { this.chargerHoraires(); this.ouvrirCreationHoraire(); },
          error: (err) => (this.erreurHoraire = err?.error?.non_field_errors?.[0] ?? "Impossible d'enregistrer cet horaire."),
        });
      return;
    }

    if (!this.formulaireHoraire.trajet || !this.formulaireHoraire.classe) return;
    this.service
      .creerHoraireRecurrent({
        trajet: this.formulaireHoraire.trajet,
        classe: this.formulaireHoraire.classe,
        heure_depart: heure,
        prix_adulte: this.formulaireHoraire.prix_adulte,
        prix_enfant: this.formulaireHoraire.prix_enfant,
      })
      .subscribe({
        next: () => { this.chargerHoraires(); this.ouvrirCreationHoraire(); },
        error: (err) => (this.erreurHoraire = err?.error?.non_field_errors?.[0] ?? err?.error?.detail ?? "Impossible de créer cet horaire (existe peut-être déjà)."),
      });
  }

  retirerHoraire(horaire: HoraireRecurrent): void {
    if (!confirm(`Retirer le départ ${this.nomTrajet(horaire.trajet)} · ${horaire.heure_depart.slice(0, 5)} ? Les places déjà vendues restent valables, les autres seront annulées.`)) return;
    this.service.supprimerHoraireRecurrent(horaire.id).subscribe({ next: () => this.chargerHoraires() });
  }

  lancerGeneration(): void {
    this.generationEnCours = true;
    this.resultatGeneration = null;
    this.service.genererVoyages(30).subscribe({
      next: (r) => {
        this.generationEnCours = false;
        this.resultatGeneration = r;
        this.chargerHoraires();
      },
      error: () => (this.generationEnCours = false),
    });
  }

  // ===================== Voyage ponctuel =====================

  private chargerVoyages(): void {
    this.chargementVoyages = true;
    this.service.listerVoyages().subscribe({
      next: (r) => {
        this.voyages = Array.isArray(r) ? r : r.results;
        this.chargementVoyages = false;
      },
      error: () => (this.chargementVoyages = false),
    });
  }

  creerVoyage(): void {
    if (!this.formulaireVoyage.trajet || !this.formulaireVoyage.bus || !this.formulaireVoyage.date) return;
    this.erreurVoyage = '';
    const dateHeure = `${this.formulaireVoyage.date}T${this.formulaireVoyage.heure}:00`;

    this.service
      .creerVoyage({ trajet: this.formulaireVoyage.trajet, bus: this.formulaireVoyage.bus, date_heure_depart: dateHeure })
      .subscribe({
        next: () => {
          this.chargerVoyages();
          this.formulaireVoyage = { trajet: null, bus: null, date: '', heure: '08:00' };
        },
        error: (err) => (this.erreurVoyage = err?.error?.non_field_errors?.[0] ?? 'Impossible de programmer ce voyage.'),
      });
  }

  supprimerVoyage(voyage: VoyageAdmin): void {
    if (!confirm('Supprimer ce voyage ?')) return;
    this.service.supprimerVoyage(voyage.id).subscribe({ next: () => this.chargerVoyages() });
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
      next: () => { this.chargerVoyages(); this.voyageSelectionnePourTarif = null; },
      error: () => (this.erreurVoyage = "Impossible d'enregistrer ce tarif."),
    });
  }
}
