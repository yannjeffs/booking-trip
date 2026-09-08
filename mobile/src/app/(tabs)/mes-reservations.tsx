import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { mesReservations } from '../../core/services/reservation.service';
import { useAuth } from '../../core/context/auth-context';
import { Reservation } from '../../core/models/models';

const LIBELLES_STATUT: Record<Reservation['statut'], string> = {
  confirmee: 'Confirmé',
  en_attente_paiement: 'En attente de paiement',
  annulee: 'Annulé',
  expiree: 'Expiré',
};

const COULEURS_STATUT: Record<Reservation['statut'], { fond: string; texte: string }> = {
  confirmee: { fond: '#dcfce7', texte: '#15803d' },
  en_attente_paiement: { fond: '#fef3c7', texte: '#b45309' },
  annulee: { fond: '#f3f4f6', texte: '#6b7280' },
  expiree: { fond: '#f3f4f6', texte: '#6b7280' },
};

export default function EcranMesReservations() {
  const router = useRouter();
  const { estConnecte } = useAuth();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);

  const charger = useCallback(async () => {
    if (!estConnecte) {
      setChargement(false);
      return;
    }
    try {
      const donnees = await mesReservations();
      setReservations(donnees);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [estConnecte]);

  // Recharge à chaque retour sur l'onglet (ex. après un paiement finalisé ailleurs).
  useFocusEffect(
    useCallback(() => {
      setChargement(true);
      charger();
    }, [charger])
  );

  async function onRafraichir() {
    setRafraichissement(true);
    charger();
  }

  if (!estConnecte) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-6">
        <Text className="text-gray-500 text-sm mb-4 text-center">Connecte-toi pour voir tes réservations.</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/connexion')} className="bg-primary rounded-lg px-6 py-3">
          <Text className="text-white font-medium">Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (chargement) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator color="#D80010" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
      data={reservations}
      keyExtractor={(item) => item.code_alphanumerique}
      refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={onRafraichir} tintColor="#D80010" />}
      ListHeaderComponent={<Text className="text-base font-semibold text-gray-900 mb-4">Mes réservations</Text>}
      ListEmptyComponent={
        <Text className="text-sm text-gray-400 text-center py-10">Aucune réservation pour le moment.</Text>
      }
      renderItem={({ item }) => {
        const couleurs = COULEURS_STATUT[item.statut];
        return (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/tickets/[code]', params: { code: item.code_alphanumerique } })}
            className="bg-white rounded-2xl border border-gray-200 p-4 mb-3"
          >
            <View className="flex-row justify-between items-start mb-2.5">
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: couleurs.fond }}>
                <Text className="text-[11px] font-medium" style={{ color: couleurs.texte }}>
                  {LIBELLES_STATUT[item.statut]}
                </Text>
              </View>
              <Text className="text-[11px] text-gray-400">{item.code_alphanumerique}</Text>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-1 mr-2">
                <Text className="text-sm font-medium text-gray-900">{item.trajet}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {new Date(item.date_heure_depart).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {item.classe}
                </Text>
              </View>
              <Text className="text-gray-400">›</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}