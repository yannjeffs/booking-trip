import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/core/context/auth-context';

export default function EcranCompte() {
  const router = useRouter();
  const { utilisateur, estConnecte, deconnexion } = useAuth();

  if (!estConnecte) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-6">
        <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
        <Text className="text-gray-500 text-sm mt-3 mb-5 text-center">
          Connecte-toi pour accéder à tes réservations et ta fidélité.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/connexion')}
          className="bg-primary rounded-lg px-6 py-3"
        >
          <Text className="text-white font-medium">Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-8">
      <View className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <Text className="text-base font-semibold text-gray-900">
          {utilisateur?.first_name} {utilisateur?.last_name}
        </Text>
        <Text className="text-sm text-gray-500 mt-0.5">{utilisateur?.telephone}</Text>
      </View>

      <TouchableOpacity
        onPress={deconnexion}
        className="flex-row items-center gap-2 bg-white rounded-2xl border border-gray-200 px-5 py-4"
      >
        <Ionicons name="log-out-outline" size={18} color="#6b7280" />
        <Text className="text-sm text-gray-600">Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}