export interface Destination {
  id: number;
  ville: string;
  region: string;
}

export interface Classe {
  id: number;
  nom: string;
  description: string;
}

export interface Colonne {
  numero: number;
  type: 'standard' | 'sortie' | 'fond';
  sieges: Siege[];
}

export interface Tarif {
  id: number;
  prix_adulte: string;
  prix_enfant: string;
}

export interface Trajet {
  id: number;
  depart: Destination;
  arrivee: Destination;
  duree_estimee: string;
  distance_km: number | null;
}

export interface Voyage {
  id: number;
  trajet: Trajet;
  bus: number;
  classe: Classe;
  date_heure_depart: string;
  statut: string;
  tarif: Tarif;
  places_disponibles: number;
}

export interface Siege {
  numero: string;
  statut: 'libre' | 'occupe';
}

export interface RangeeSieges {
  numero: number;
  type: 'standard' | 'sortie' | 'fond';
  sieges: Siege[];
}

export interface PlanSieges {
  voyage_id: number;
  rangees: RangeeSieges[];
}

export interface PassagerInput {
  nom: string;
  age: number | null;
  siege: string;
}

export type TypeBillet = 'aller_simple' | 'aller_retour';

export interface Reservation {
  code_alphanumerique: string;
  qr_token: string;
  statut: 'en_attente_paiement' | 'confirmee' | 'annulee' | 'expiree';
  canal: 'en_ligne' | 'guichet';
  type_billet: TypeBillet;
  trajet: string;
  voyage_id: number;
  date_heure_depart: string;
  classe: string;
  montant_total: string;
  est_recompense_fidelite: boolean;
  date_creation: string;
  date_expiration: string | null;
  embarque: boolean;
  date_embarquement: string | null;
  passagers: PassagerInput[];
  reservation_retour: Reservation | null;
}

export interface CreerReservationPayload {
  voyage: number;
  passagers: PassagerInput[];
  payer_maintenant: boolean;
  type_billet: TypeBillet;
  voyage_retour?: number;
  passagers_retour?: PassagerInput[];
  utiliser_credit_fidelite?: boolean;
}

export interface Utilisateur {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  telephone: string;
  role: 'client' | 'agent' | 'admin';
}

export interface Bus {
  id: number;
  immatriculation: string;
  capacite: number;
  plan_sieges: { rangees: number; colonnes: string[] };
  classe: number;
  actif: boolean;
}

export interface VoyageAdmin {
  id: number;
  trajet: number;
  bus: number;
  classe_id: number;
  date_heure_depart: string;
  statut: string;
  tarif: { id: number; voyage: number; prix_adulte: string; prix_enfant: string } | null;
}

export interface DashboardStats {
  voyages_aujourd_hui: number;
  reservations_confirmees_total: number;
  chiffre_affaires_total: string;
  ventes_par_canal: { canal: string; nombre: number; montant: string }[];
  reservations_en_attente: number;
  paiements_echoues_7j: number;
}

export interface ProgrammeFidelite {
  nb_aller_simple_valides: number;
  nb_aller_retour_valides: number;
  credits_aller_simple: number;
  credits_aller_retour: number;
}

export interface HoraireRecurrent {
  id: number;
  trajet: number;
  classe: number;
  heure_depart: string; // au format HH:MM:SS
  prix_adulte: string;
  prix_enfant: string;
  actif: boolean;
  nb_voyages_a_venir: number;
}

export interface ResultatGeneration {
  crees: number;
  deja_existants: number;
  classes_sans_bus: string[];
}
