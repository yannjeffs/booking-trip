import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../../src/core/context/auth-context';

export default function EcranConnexion() {
  const router = useRouter();
  const { connexion } = useAuth();

  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  async function seConnecter() {
    setChargement(true);
    setErreur('');
    try {
      await connexion(telephone, password);
      router.replace('/(tabs)');
    } catch {
      setErreur('Numéro ou mot de passe incorrect.');
    } finally {
      setChargement(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-gray-50 justify-center px-6"
    >
      <View className="bg-white rounded-2xl border border-gray-200 p-6">
        <Text className="text-lg font-semibold text-gray-900 mb-1">Connexion</Text>
        <Text className="text-sm text-gray-500 mb-6">Accédez à vos réservations et votre fidélité</Text>

        <Text className="text-xs text-gray-500 mb-1">Numéro de téléphone</Text>
        <TextInput
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
          placeholder="6XX XXX XXX"
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-3"
        />

        <Text className="text-xs text-gray-500 mb-1">Mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-3"
        />

        {!!erreur && <Text className="text-sm text-red-600 mb-3">{erreur}</Text>}

        <TouchableOpacity
          onPress={seConnecter}
          disabled={chargement}
          className="bg-primary rounded-lg py-3 items-center"
          style={{ opacity: chargement ? 0.6 : 1 }}
        >
          <Text className="text-white font-medium">{chargement ? 'Connexion...' : 'Se connecter'}</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-4">
          <Text className="text-sm text-gray-500">Pas encore de compte ? </Text>
          <Link href="/(auth)/inscription" asChild>
            <TouchableOpacity>
              <Text className="text-sm text-primary font-medium">S&apos;inscrire</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}