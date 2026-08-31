import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPlanSieges } from '../../../core/services/voyage.service';
import { creerReservation, getMaFidelite } from '../../../core/services/reservation.service';
import { useAuth } from '../../../core/context/auth-context';
import { Siege, PassagerInput, TypeBillet, ProgrammeFidelite } from '../../../core/models/models';

export default function EcranSieges() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; type?: string; retour?: string }>();
  const { utilisateur, estConnecte } = useAuth();

  const voyageId = Number(params.id);
  const type = (params.type as TypeBillet) ?? 'aller_simple';
  const voyageRetourId = params.retour ? Number(params.retour) : null;

  const [siegesAller, setSiegesAller] = useState<Siege[]>([]);
  const [siegesAllerSelectionnes, setSiegesAllerSelectionnes] = useState<string[]>([]);
  const [siegesRetour, setSiegesRetour] = useState<Siege[]>([]);
  const [siegesRetourSelectionnes, setSiegesRetourSelectionnes] = useState<string[]>([]);

  const [chargement, setChargement] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState('');

  // false = "je réserve, je paie plus tard" ; true = "j'achète tout de suite"
  const [payerMaintenant, setPayerMaintenant] = useState(true);

  const [fidelite, setFidelite] = useState<ProgrammeFidelite | null>(null);
  const [utiliserCreditFidelite, setUtiliserCreditFidelite] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const planAller = await getPlanSieges(voyageId);
        setSiegesAller(planAller.sieges);
        if (voyageRetourId) {
          const planRetour = await getPlanSieges(voyageRetourId);
          setSiegesRetour(planRetour.sieges);
        }
      } finally {
        setChargement(false);
      }
    })();

    if (estConnecte) {
      getMaFidelite().then(setFidelite).catch(() => {});
    }
  }, [voyageId, voyageRetourId, estConnecte]);

  const creditDisponible = fidelite
    ? (type === 'aller_simple' ? fidelite.credits_aller_simple : fidelite.credits_aller_retour)
    : 0;

  function basculerSiegeAller(siege: Siege) {
    if (siege.statut === 'occupe') return;
    setSiegesAllerSelectionnes((prev) =>
      prev.includes(siege.numero) ? prev.filter((s) => s !== siege.numero) : [...prev, siege.numero]
    );
  }

  function basculerSiegeRetour(siege: Siege) {
    if (siege.statut === 'occupe') return;
    setSiegesRetourSelectionnes((prev) =>
      prev.includes(siege.numero) ? prev.filter((s) => s !== siege.numero) : [...prev, siege.numero]
    );
  }

  const pretAContinuer =
    siegesAllerSelectionnes.length > 0 &&
    (type !== 'aller_retour' || siegesRetourSelectionnes.length === siegesAllerSelectionnes.length);

  function construireNomPassager(index: number): string {
    if (siegesAllerSelectionnes.length === 1 && estConnecte && utilisateur) {
      return `${utilisateur.first_name} ${utilisateur.last_name}`.trim();
    }
    return `Passager ${index + 1}`;
  }

  async function continuer() {
    if (!pretAContinuer) return;
    setEnvoiEnCours(true);
    setErreur('');

    const passagers: PassagerInput[] = siegesAllerSelectionnes.map((siege, i) => ({
      nom: construireNomPassager(i),
      age: null,
      siege,
    }));

    try {
      const reservation = await creerReservation({
        voyage: voyageId,
        passagers,
        payer_maintenant: payerMaintenant,
        type_billet: type,
        utiliser_credit_fidelite: utiliserCreditFidelite,
        ...(type === 'aller_retour' && voyageRetourId
          ? {
              voyage_retour: voyageRetourId,
              passagers_retour: siegesRetourSelectionnes.map((siege, i) => ({
                nom: passagers[i]?.nom ?? `Passager ${i + 1}`,
                age: null,
                siege,
              })),
            }
          : {}),
      });

      if (reservation.statut === 'confirmee' || !payerMaintenant) {
        router.replace({ pathname: '/tickets/[code]', params: { code: reservation.code_alphanumerique } });
      } else {
        router.replace({ pathname: '/paiement/[code]', params: { code: reservation.code_alphanumerique } });
      }
    } catch (err: any) {
      setErreur(
        err?.response?.data?.non_field_errors?.[0] ??
        err?.response?.data?.detail ??
        'Une erreur est survenue, merci de réessayer.'
      );
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (chargement) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator color="#D80010" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }}>
      <GrilleSieges titre="Sièges — aller" sieges={siegesAller} selectionnes={siegesAllerSelectionnes} onToggle={basculerSiegeAller} />

      {type === 'aller_retour' && (
        <GrilleSieges
          titre="Sièges — retour"
          sousTitre={`Choisissez le même nombre de sièges qu'à l'aller (${siegesAllerSelectionnes.length})`}
          sieges={siegesRetour}
          selectionnes={siegesRetourSelectionnes}
          onToggle={basculerSiegeRetour}
        />
      )}

      <View className="bg-white rounded-2xl border border-gray-200 p-5 mt-4">
        <Text className="text-sm font-semibold text-gray-900 mb-3">Finaliser</Text>

        <View className="flex-row bg-gray-100 rounded-lg p-1 mb-3">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md items-center ${payerMaintenant ? 'bg-white' : ''}`}
            onPress={() => setPayerMaintenant(true)}
          >
            <Text className={`text-[13px] ${payerMaintenant ? 'font-semibold text-gray-900' : 'font-medium text-gray-400'}`}>
              Acheter maintenant
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md items-center ${!payerMaintenant ? 'bg-white' : ''}`}
            onPress={() => setPayerMaintenant(false)}
          >
            <Text className={`text-[13px] ${!payerMaintenant ? 'font-semibold text-gray-900' : 'font-medium text-gray-400'}`}>
              Réserver (payer plus tard)
            </Text>
          </TouchableOpacity>
        </View>
        {!payerMaintenant && (
          <Text className="text-xs text-gray-400 mb-3">
            Un code vous sera fourni pour finaliser l&apos;achat avant l&apos;expiration de la réservation.
          </Text>
        )}

        {creditDisponible > 0 && (
          <View className="flex-row items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-3">
            <Text className="text-[13px] text-green-800 flex-1 mr-2">
              🎁 Utiliser mon billet fidélité gratuit ({creditDisponible} disponible{creditDisponible > 1 ? 's' : ''})
            </Text>
            <Switch value={utiliserCreditFidelite} onValueChange={setUtiliserCreditFidelite} />
          </View>
        )}

        {!!erreur && <Text className="text-sm text-red-600 mb-3">{erreur}</Text>}

        <TouchableOpacity
          onPress={continuer}
          disabled={!pretAContinuer || envoiEnCours}
          className="bg-primary rounded-lg py-3.5 items-center"
          style={{ opacity: !pretAContinuer || envoiEnCours ? 0.5 : 1 }}
        >
          <Text className="text-white font-semibold text-sm">{envoiEnCours ? 'Envoi...' : 'Continuer'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function GrilleSieges({
  titre, sousTitre, sieges, selectionnes, onToggle,
}: {
  titre: string; sousTitre?: string; sieges: Siege[]; selectionnes: string[]; onToggle: (s: Siege) => void;
}) {
  return (
    <View className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
      <Text className="text-base font-semibold text-gray-900">{titre}</Text>
      {sousTitre && <Text className="text-xs text-gray-500 mb-3">{sousTitre}</Text>}

      <View className="flex-row mb-3" style={{ gap: 16 }}>
        <Legende couleur="#fff" bordure label="Libre" />
        <Legende couleur="#D80010" label="Sélectionné" />
        <Legende couleur="#9ca3af" label="Occupé" />
      </View>

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {sieges.map((siege) => {
          const occupe = siege.statut === 'occupe';
          const selectionne = selectionnes.includes(siege.numero);
          return (
            <TouchableOpacity
              key={siege.numero}
              disabled={occupe}
              onPress={() => onToggle(siege)}
              className="w-9 h-9 rounded-md border items-center justify-center"
              style={{
                backgroundColor: occupe ? '#9ca3af' : selectionne ? '#D80010' : '#fff',
                borderColor: occupe || selectionne ? 'transparent' : '#d1d5db',
              }}
            >
              <Text className={`text-[10px] ${occupe || selectionne ? 'text-white' : 'text-gray-700'}`}>{siege.numero}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="text-xs text-gray-500 mt-3">Sièges : {selectionnes.join(', ') || '—'}</Text>
    </View>
  );
}

function Legende({ couleur, bordure, label }: { couleur: string; bordure?: boolean; label: string }) {
  return (
    <View className="flex-row items-center" style={{ gap: 5 }}>
      <View
        style={{
          width: 10, height: 10, borderRadius: 3, backgroundColor: couleur,
          borderWidth: bordure ? 1 : 0, borderColor: '#d1d5db',
        }}
      />
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );
}