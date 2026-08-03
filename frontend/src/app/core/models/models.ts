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

export interface Tarif {
  id: number;
  classe: Classe;
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
  date_heure_depart: string;
  statut: string;
  tarifs: Tarif[];
  places_disponibles: number;
}

export interface Siege {
  numero: string;
  statut: 'libre' | 'occupe';
}

export interface PlanSieges {
  voyage_id: number;
  sieges: Siege[];
}

export interface PassagerInput {
  nom: string;
  age: number | null;
  siege: string;
}

export interface Reservation {
  code_alphanumerique: string;
  qr_token: string;
  statut: 'en_attente_paiement' | 'confirmee' | 'annulee' | 'expiree';
  canal: 'en_ligne' | 'guichet';
  trajet: string;
  voyage_id: number;
  date_heure_depart: string;
  classe: string;
  montant_total: string;
  date_creation: string;
  date_expiration: string | null;
  embarque: boolean;
  date_embarquement: string | null;
  passagers: PassagerInput[];
}

export interface CreerReservationPayload {
  voyage: number;
  tarif: number;
  passagers: PassagerInput[];
  payer_maintenant: boolean;
}
