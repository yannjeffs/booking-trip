import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { rechercherReservationParCode, payerReservation } from '../../core/services/reservation.service';
import { Reservation } from '../../core/models/models';

type ModePaiement = 'orange_money' | 'mtn_momo' | 'carte_bancaire';

export default function EcranPaiement() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [provider, setProvider] = useState<ModePaiement>('orange_money');
  const [numeroTelephone, setNumeroTelephone] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [urlPaiement, setUrlPaiement] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    rechercherReservationParCode(code).then(setReservation).catch(() => {});
  }, [code]);

  async function payer() {
    if (!code) return;
    setEnvoiEnCours(true);
    setErreur('');
    try {
      const reponse = await payerReservation(code, provider, numeroTelephone);
      setUrlPaiement(reponse.payment_url);
    } catch (err: any) {
      setErreur(err?.response?.data?.detail ?? 'Le paiement a échoué, merci de réessayer.');
    } finally {
      setEnvoiEnCours(false);
    }
  }

  // Le return_url configuré côté backend pointe vers /tickets/{code} (sur le web comme
  // sur mobile, seul le chemin compte ici) — dès que la WebView y arrive, on ferme la
  // modale et on continue nativement vers l'écran de confirmation.
  function onNavigationStateChange(etat: WebViewNavigation) {
    if (code && etat.url.includes(`/tickets/${code}`)) {
      setUrlPaiement(null);
      router.replace({ pathname: '/tickets/[code]', params: { code } });
    }
  }

  if (!reservation) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator color="#D80010" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: 60, paddingHorizontal: 16 }}>
      <View className="bg-white rounded-2xl border border-gray-200 p-5">
        <Text className="text-base font-semibold text-gray-900 mb-4">Paiement</Text>

        <View className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-[13px] text-gray-600">{reservation.trajet}</Text>
            <Text className="text-[13px] text-gray-600">
              {new Date(reservation.date_heure_depart).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[13px] text-gray-600">{reservation.classe}</Text>
            <Text className="text-[13px] font-semibold text-gray-900">{reservation.montant_total} FCFA</Text>
          </View>
        </View>

        <Text className="text-xs text-gray-500 mb-2">Mode de paiement</Text>
        <View style={{ gap: 8 }} className="mb-4">
          <OptionPaiement label="Orange Money" active={provider === 'orange_money'} onPress={() => setProvider('orange_money')} />
          <OptionPaiement label="MTN Mobile Money" active={provider === 'mtn_momo'} onPress={() => setProvider('mtn_momo')} />
          <OptionPaiement label="Carte bancaire" active={provider === 'carte_bancaire'} onPress={() => setProvider('carte_bancaire')} />
        </View>

        {provider !== 'carte_bancaire' && (
          <>
            <Text className="text-xs text-gray-500 mb-1">Numéro de téléphone</Text>
            <TextInput
              value={numeroTelephone}
              onChangeText={setNumeroTelephone}
              keyboardType="phone-pad"
              placeholder="6XX XXX XXX"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-4"
            />
          </>
        )}

        {!!erreur && <Text className="text-sm text-red-600 mb-3">{erreur}</Text>}

        <TouchableOpacity
          onPress={payer}
          disabled={envoiEnCours}
          className="bg-primary rounded-lg py-3.5 items-center"
          style={{ opacity: envoiEnCours ? 0.6 : 1 }}
        >
          <Text className="text-white font-semibold text-sm">
            {envoiEnCours ? 'Traitement...' : `Payer ${reservation.montant_total} FCFA`}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!urlPaiement} animationType="slide" onRequestClose={() => setUrlPaiement(null)}>
        <View style={{ flex: 1, paddingTop: 50 }}>
          <TouchableOpacity onPress={() => setUrlPaiement(null)} className="px-4 pb-2">
            <Text className="text-sm text-gray-500">✕ Annuler</Text>
          </TouchableOpacity>
          {urlPaiement && (
            <WebView
              source={{ uri: urlPaiement }}
              onNavigationStateChange={onNavigationStateChange}
              startInLoadingState
              renderLoading={() => (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator color="#D80010" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function OptionPaiement({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center border rounded-lg px-3 py-2.5"
      style={{ borderColor: active ? '#D80010' : '#d1d5db', backgroundColor: active ? '#fef2f2' : '#fff' }}
    >
      <View
        className="w-4 h-4 rounded-full border mr-2.5"
        style={{ borderColor: active ? '#D80010' : '#9ca3af', backgroundColor: active ? '#D80010' : 'transparent' }}
      />
      <Text className="text-sm font-medium text-gray-900">{label}</Text>
    </TouchableOpacity>
  );
}