import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EcranMesReservations() {
  return (
    <View className="flex-1 bg-gray-50 justify-center items-center px-6">
      <Ionicons name="ticket-outline" size={64} color="#9ca3af" />
      <Text className="text-gray-500 text-sm mt-3 text-center">Bientôt disponible.</Text>
    </View>
  );
}