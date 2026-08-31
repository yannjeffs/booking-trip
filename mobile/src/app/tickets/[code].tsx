import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { rechercherReservationParCode } from '../../core/services/reservation.service';
import { Reservation } from '../../core/models/models';

const MAX_TENTATIVES = 10; // ~30s de rafraîchissement (le webhook CinetPay arrive généralement en quelques secondes)

export default function EcranConfirmation() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [verificationEnCours, setVerificationEnCours] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tentativesRef = useRef(0);

  const reverifier = useCallback(async () => {
    if (!code) return;

    tentativesRef.current += 1;
    const r = await rechercherReservationParCode(code);
    setReservation(r);

    if (r.statut === 'confirmee' || tentativesRef.current >= MAX_TENTATIVES) {
      setVerificationEnCours(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [code]);

  const charger = useCallback(async () => {
    if (!code) return;

    const r = await rechercherReservationParCode(code);
    setReservation(r);

    if (r.statut === 'en_attente_paiement' && !intervalRef.current) {
      setVerificationEnCours(true);
      intervalRef.current = setInterval(reverifier, 3000);
    }
  }, [code, reverifier]);

  useEffect(() => {
    if (!code) return;
    charger();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [code, charger]);

  if (!reservation) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator color="#D80010" />
      </View>
    );
  }

  const confirmee = reservation.statut === 'confirmee';

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <View className="items-center mb-4">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-2"
          style={{ backgroundColor: confirmee ? '#dcfce7' : '#fef3c7' }}
        >
          <Text style={{ fontSize: 22 }}>{confirmee ? '✓' : '⏱'}</Text>
        </View>
        <Text className="font-semibold text-gray-900">{confirmee ? 'Réservation confirmée' : 'Réservation enregistrée'}</Text>
        <Text className="text-sm text-gray-500 text-center mt-0.5">
          {confirmee
            ? 'Billet envoyé par SMS et WhatsApp'
            : `Finalisez l'achat avant ${new Date(reservation.date_expiration ?? '').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} avec le code ${reservation.code_alphanumerique}`}
        </Text>
      </View>

      {verificationEnCours && (
        <View className="flex-row items-center justify-center mb-4" style={{ gap: 6 }}>
          <ActivityIndicator size="small" color="#6b7280" />
          <Text className="text-sm text-gray-500">Vérification du paiement en cours...</Text>
        </View>
      )}

      {!confirmee && (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/paiement/[code]', params: { code: reservation.code_alphanumerique } })}
          className="bg-primary rounded-lg py-3 items-center mb-4"
        >
          <Text className="text-white font-medium text-sm">Payer maintenant</Text>
        </TouchableOpacity>
      )}

      <BilletCarte reservation={reservation} etiquette={reservation.type_billet === 'aller_retour' ? 'Aller' : undefined} />

      {reservation.reservation_retour && (
        <BilletCarte reservation={reservation.reservation_retour} etiquette="Retour" />
      )}

      <TouchableOpacity onPress={() => router.replace('/(tabs)/mes-reservations')} className="items-center mt-2">
        <Text className="text-sm text-gray-500">Voir mes réservations</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function BilletCarte({ reservation, etiquette }: { reservation: Reservation; etiquette?: string }) {
  const confirmee = reservation.statut === 'confirmee';
  return (
    <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
      {etiquette && (
        <View className="px-5 pt-4">
          <View className="self-start bg-gray-100 rounded-full px-2 py-0.5">
            <Text className="text-[11px] font-medium text-gray-600">{etiquette}</Text>
          </View>
        </View>
      )}

      <View className="items-center p-5">
        {confirmee && reservation.qr_token ? (
          <QRCode value={reservation.qr_token} size={150} />
        ) : (
          <View style={{ width: 150, height: 150 }} className="bg-gray-100 rounded-lg" />
        )}
        <Text className="text-xs text-gray-400 mt-3">N° BILLET {reservation.code_alphanumerique}</Text>
      </View>

      <View className="border-t border-dashed border-gray-300" />

      <View className="p-4">
        <View className="flex-row justify-between mb-3">
          <View>
            <Text className="text-[11px] text-gray-400">Trajet</Text>
            <Text className="text-sm font-medium text-gray-900">{reservation.trajet}</Text>
          </View>
          <View className="items-end">
            <Text className="text-[11px] text-gray-400">Départ</Text>
            <Text className="text-sm font-medium text-gray-900">
              {new Date(reservation.date_heure_depart).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View className="border-t border-gray-200 pt-2">
          <LigneInfo label="Classe" valeur={reservation.classe} />
          <LigneInfo label="Sièges" valeur={`${reservation.passagers.length} passager(s)`} />
          <LigneInfo label="Montant" valeur={`${reservation.montant_total} FCFA`} />
          <LigneInfo label="Statut" valeur={reservation.statut} />
        </View>
      </View>
    </View>
  );
}

function LigneInfo({ label, valeur }: { label: string; valeur: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-[13px] text-gray-500">{label}</Text>
      <Text className="text-[13px] text-gray-900">{valeur}</Text>
    </View>
  );
}