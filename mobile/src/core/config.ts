/**
 * URL de base de l'API Django.
 *
 * ATTENTION réseau mobile — "localhost" ne fonctionne PAS depuis un appareil/émulateur
 * comme depuis un navigateur web :
 * - Émulateur Android : utiliser 10.0.2.2 à la place de localhost
 *   (ex: "http://10.0.2.2:8000/api")
 * - Appareil physique (Expo Go) : utiliser l'IP locale de ta machine sur le même
 *   réseau Wi-Fi (ex: "http://192.168.1.42:8000/api") — trouvable avec `ipconfig`
 *   (Windows) ou `ifconfig`/`ip a` (Mac/Linux)
 * - Simulateur iOS (Mac uniquement) : localhost fonctionne normalement
 *
 * Le webhook CinetPay (côté serveur) reste indépendant de cette URL — il continue
 * de passer par le tunnel ngrok configuré dans le backend.
 */
export const API_BASE_URL = 'http://192.168.25.244:8000/api'; // <- à adapter à ton réseau