import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const CLE_ACCESS = 'cx_access_token';
const CLE_REFRESH = 'cx_refresh_token';

// eslint-disable-next-line import/no-named-as-default-member
export const api = axios.create({ baseURL: API_BASE_URL });

// Attache le token JWT à chaque requête.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(CLE_ACCESS);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tente un refresh automatique une fois en cas de 401, comme côté web.
let rafraichissementEnCours: Promise<string | null> | null = null;

async function rafraichirToken(): Promise<string | null> {
  const refresh = await AsyncStorage.getItem(CLE_REFRESH);
  if (!refresh) return null;
  try {
    const reponse = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh });
    await AsyncStorage.setItem(CLE_ACCESS, reponse.data.access);
    return reponse.data.access;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (reponse) => reponse,
  async (erreur) => {
    const requeteOriginale = erreur.config;
    const estRequeteAuth = requeteOriginale?.url?.includes('/auth/token/');

    if (erreur.response?.status === 401 && !requeteOriginale._dejaRelancee && !estRequeteAuth) {
      requeteOriginale._dejaRelancee = true;
      if (!rafraichissementEnCours) rafraichissementEnCours = rafraichirToken();
      const nouveauToken = await rafraichissementEnCours;
      rafraichissementEnCours = null;

      if (nouveauToken) {
        requeteOriginale.headers.Authorization = `Bearer ${nouveauToken}`;
        return api(requeteOriginale);
      }
      // Le refresh a échoué : purge la session, l'écran appelant gère la redirection.
      await AsyncStorage.multiRemove([CLE_ACCESS, CLE_REFRESH, 'cx_utilisateur']);
    }
    return Promise.reject(erreur);
  }
);

export { CLE_ACCESS, CLE_REFRESH };