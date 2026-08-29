import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../../src/core/context/auth-context';

export default function EcranInscription() {
  const router = useRouter();
  const { inscription } = useAuth();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  async function sInscrire() {
    setChargement(true);
    setErreur('');
    try {
      await inscription({ telephone, password, first_name: prenom, last_name: nom });
      router.replace('/(tabs)');
    } catch (err: any) {
      const donnees = err?.response?.data;
      setErreur(donnees?.telephone?.[0] ?? donnees?.password?.[0] ?? "Inscription impossible, vérifiez vos informations.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-gray-50 justify-center px-6"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl border border-gray-200 p-6">
          <Text className="text-lg font-semibold text-gray-900 mb-1">Créer un compte</Text>
          <Text className="text-sm text-gray-500 mb-6">Suivez vos réservations et cumulez des billets gratuits</Text>

          <View className="flex-row gap-2 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Prénom</Text>
              <TextInput value={prenom} onChangeText={setPrenom} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Nom</Text>
              <TextInput value={nom} onChangeText={setNom} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </View>
          </View>

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
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />
          <Text className="text-[11px] text-gray-400 mb-3 mt-1">6 caractères minimum</Text>

          {!!erreur && <Text className="text-sm text-red-600 mb-3">{erreur}</Text>}

          <TouchableOpacity
            onPress={sInscrire}
            disabled={chargement}
            className="bg-primary rounded-lg py-3 items-center"
            style={{ opacity: chargement ? 0.6 : 1 }}
          >
            <Text className="text-white font-medium">{chargement ? 'Création...' : 'Créer mon compte'}</Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-sm text-gray-500">Déjà un compte ? </Text>
            <Link href="/(auth)/connexion" asChild>
              <TouchableOpacity>
                <Text className="text-sm text-primary font-medium">Se connecter</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}