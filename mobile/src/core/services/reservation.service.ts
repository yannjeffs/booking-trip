import { CreerReservationPayload, ProgrammeFidelite, Reservation } from "../models/models";
import { api } from "./api";

export async function creerReservation(payload: CreerReservationPayload): Promise<Reservation> {
    const r = await api.post('/reservations/', payload);
    return r.data;
}

export async function payerReservation(code: string, provider: 'orange_money' | 'mtn_momo' | 'carte_bancaire', numeroTelephone: string): Promise<{ paiement_id: number; statut: string; payment_url: string; detail: string; }> {
    const r = await api.post(`/reservations/${code}/payer/`, { provider, numero_telephone: numeroTelephone });
    return r.data;
}

export async function rechercherReservationParCode(code: string): Promise<Reservation> {
    const r = await api.get('tickets/lookup/', { params: { code } });
    return r.data;
}

export async function getMaFidelite(): Promise<ProgrammeFidelite> {
    const r = await api.get('/fidelite/moi/');
    return r.data;
}

