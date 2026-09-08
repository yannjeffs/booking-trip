import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../core/context/auth-context';
import { getMaFidelite } from '../../core/services/reservation.service';
import { ProgrammeFidelite } from '../../core/models/models';

export default function EcranCompte() {
  const router = useRouter();
  const { utilisateur, estConnecte, deconnexion } = useAuth();

  const [fidelite, setFidelite] = useState<ProgrammeFidelite | null>(null);
  const [chargement, setChargement] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!estConnecte) {
        setChargement(false);
        return;
      }
      setChargement(true);
      getMaFidelite()
        .then(setFidelite)
        .finally(() => setChargement(false));
    }, [estConnecte])
  );

  if (!estConnecte) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-6">
        <Text className="text-gray-500 text-sm mt-3 mb-5 text-center">
          Connecte-toi pour retrouver tes réservations et ta fidélité.
        </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/connexion')} className="bg-primary rounded-lg px-6 py-3">
          <Text className="text-white font-medium">Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <View className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <Text className="text-base font-semibold text-gray-900">
          {utilisateur?.first_name} {utilisateur?.last_name}
        </Text>
        <Text className="text-sm text-gray-500 mt-0.5">{utilisateur?.telephone}</Text>
      </View>

      <View className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <Text className="text-sm font-semibold text-gray-900 mb-3">🎁 Ma fidélité</Text>

        {chargement ? (
          <ActivityIndicator color="#D80010" style={{ alignSelf: 'flex-start' }} />
        ) : (
          <>
            <BlocFidelite
              titre="Aller simple"
              nbValides={fidelite?.nb_aller_simple_valides ?? 0}
              credits={fidelite?.credits_aller_simple ?? 0}
            />
            <View className="h-3" />
            <BlocFidelite
              titre="Aller-retour"
              nbValides={fidelite?.nb_aller_retour_valides ?? 0}
              credits={fidelite?.credits_aller_retour ?? 0}
            />
            <Text className="text-[11px] text-gray-400 mt-3">
              5 billets solo (à votre nom) d&apos;un type = 1 billet gratuit du même type.
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={deconnexion}
        className="flex-row items-center gap-2 bg-white rounded-2xl border border-gray-200 px-5 py-4"
      >
        <Text className="text-sm text-gray-600">Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

function BlocFidelite({ titre, nbValides, credits }: { titre: string; nbValides: number; credits: number }) {
  const restant = nbValides % 5;
  return (
    <View>
      <View className="flex-row justify-between items-center mb-1.5">
        <Text className="text-[13px] font-medium text-gray-700">{titre}</Text>
        {credits > 0 && (
          <View className="bg-green-100 rounded-full px-2 py-0.5">
            <Text className="text-[11px] font-medium text-green-700">
              {credits} gratuit{credits > 1 ? 's' : ''} disponible{credits > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
      <View className="flex-row" style={{ gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="flex-1 h-1.5 rounded-full"
            style={{ backgroundColor: i < restant ? '#D80010' : '#e5e7eb' }}
          />
        ))}
      </View>
      <Text className="text-[11px] text-gray-400 mt-1">{restant}/5 avant le prochain billet gratuit</Text>
    </View>
  );
}