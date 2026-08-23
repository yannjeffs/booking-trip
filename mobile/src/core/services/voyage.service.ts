import { api } from './api';
import { Destination, Voyage, Siege } from '../models/models';

export async function getDestinations(): Promise<Destination[]> {
  const r = await api.get('/destinations/');
  return r.data.results ?? r.data;
}

export async function rechercherVoyages(filtres: { depart?: string; arrivee?: string; date?: string }): Promise<Voyage[]> {
  const r = await api.get('/voyages/', { params: filtres });
  return r.data.results ?? r.data;
}

export async function getPlanSieges(voyageId: number): Promise<{ voyage_id: number; sieges: Siege[] }> {
  const r = await api.get(`/voyages/${voyageId}/sieges/`);
  return r.data;
}