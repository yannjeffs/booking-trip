import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, CLE_ACCESS, CLE_REFRESH } from '../services/api';
import { Utilisateur } from '../models/models';

const CLE_UTILISATEUR = 'cx_utilisateur';

interface ReponseAuth {
  access: string;
  refresh: string;
  utilisateur: Utilisateur;
}

interface AuthContextValeur {
  utilisateur: Utilisateur | null;
  chargementInitial: boolean;
  estConnecte: boolean;
  connexion: (telephone: string, password: string) => Promise<void>;
  inscription: (data: { telephone: string; password: string; first_name: string; last_name: string }) => Promise<void>;
  deconnexion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValeur | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargementInitial, setChargementInitial] = useState(true);

  useEffect(() => {
    (async () => {
      const brut = await AsyncStorage.getItem(CLE_UTILISATEUR);
      if (brut) setUtilisateur(JSON.parse(brut));
      setChargementInitial(false);
    })();
  }, []);

  const enregistrerSession = useCallback(async (reponse: ReponseAuth) => {
    await AsyncStorage.setMany({
      [CLE_ACCESS]: reponse.access,
      [CLE_REFRESH]: reponse.refresh,
      [CLE_UTILISATEUR]: JSON.stringify(reponse.utilisateur),
    });
    setUtilisateur(reponse.utilisateur);
  }, []);

  const connexion = useCallback(async (telephone: string, password: string) => {
    const reponse = await api.post<ReponseAuth>('/auth/token/', { username: telephone, password });
    await enregistrerSession(reponse.data);
  }, [enregistrerSession]);

  const inscription = useCallback(async (data: { telephone: string; password: string; first_name: string; last_name: string }) => {
    const reponse = await api.post<ReponseAuth>('/auth/inscription/', data);
    await enregistrerSession(reponse.data);
  }, [enregistrerSession]);

  const deconnexion = useCallback(async () => {
    await AsyncStorage.removeMany([CLE_ACCESS, CLE_REFRESH, CLE_UTILISATEUR]);
    setUtilisateur(null);
  }, []);

  return (
    <AuthContext.Provider value={{ utilisateur, chargementInitial, estConnecte: !!utilisateur, connexion, inscription, deconnexion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValeur {
  const contexte = useContext(AuthContext);
  if (!contexte) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.');
  return contexte;
}