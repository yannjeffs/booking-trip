import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getDestinations, rechercherVoyages } from '../../../src/core/services/voyage.service';
import { Destination, Voyage, TypeBillet } from '../../../src/core/models/models';

export default function EcranRecherche() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [type, setType] = useState<TypeBillet>('aller_simple');
  const [depart, setDepart] = useState('');
  const [arrivee, setArrivee] = useState('');
  const [date, setDate] = useState(new Date());
  const [dateRetour, setDateRetour] = useState(new Date());
  const [afficherDatePicker, setAfficherDatePicker] = useState<'aller' | 'retour' | null>(null);

  const [resultatsAller, setResultatsAller] = useState<Voyage[]>([]);
  const [resultatsRetour, setResultatsRetour] = useState<Voyage[]>([]);
  const [voyageAllerChoisi, setVoyageAllerChoisi] = useState<Voyage | null>(null);
  const [rechercheEffectuee, setRechercheEffectuee] = useState(false);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    getDestinations().then(setDestinations).catch(() => {});
  }, []);

  const dateISO = (d: Date) => d.toISOString().slice(0, 10);

  async function rechercher() {
    if (!depart || !arrivee) return;
    setChargement(true);
    setRechercheEffectuee(true);
    setVoyageAllerChoisi(null);
    try {
      const aller = await rechercherVoyages({ depart, arrivee, date: dateISO(date) });
      setResultatsAller(aller);
      if (type === 'aller_retour') {
        const retour = await rechercherVoyages({ depart: arrivee, arrivee: depart, date: dateISO(dateRetour) });
        setResultatsRetour(retour);
      }
    } finally {
      setChargement(false);
    }
  }

  function choisirAller(voyage: Voyage) {
    if (type === 'aller_simple') {
      router.push({ pathname: '/voyages/[id]/sieges', params: { id: String(voyage.id), type } });
      return;
    }
    setVoyageAllerChoisi(voyage);
  }

  function choisirRetour(voyageRetour: Voyage) {
    if (!voyageAllerChoisi) return;
    router.push({
      pathname: '/voyages/[id]/sieges',
      params: { id: String(voyageAllerChoisi.id), type, retour: String(voyageRetour.id) },
    });
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
      <View className="bg-white rounded-2xl border border-gray-200 p-5">
        <Text className="text-base font-semibold text-gray-900">Réserver un trajet</Text>
        <Text className="text-sm text-gray-500 mb-4">Trouvez votre prochain voyage</Text>

        <View className="flex-row bg-gray-100 rounded-lg p-1 mb-4">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md items-center ${type === 'aller_simple' ? 'bg-white' : ''}`}
            onPress={() => setType('aller_simple')}
          >
            <Text className={`text-[13px] ${type === 'aller_simple' ? 'font-semibold text-gray-900' : 'font-medium text-gray-400'}`}>
              Aller simple
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md items-center ${type === 'aller_retour' ? 'bg-white' : ''}`}
            onPress={() => setType('aller_retour')}
          >
            <Text className={`text-[13px] ${type === 'aller_retour' ? 'font-semibold text-gray-900' : 'font-medium text-gray-400'}`}>
              Aller-retour
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xs text-gray-500 mb-1.5">Départ</Text>
        <View className="flex-row flex-wrap gap-2 mb-3.5">
          {destinations.map((d) => (
            <TouchableOpacity
              key={d.id}
              onPress={() => setDepart(d.ville)}
              className={`px-3 py-1.5 rounded-full border ${depart === d.ville ? 'bg-primary border-primary' : 'border-gray-300'}`}
            >
              <Text className={`text-[13px] ${depart === d.ville ? 'text-white font-semibold' : 'text-gray-700'}`}>{d.ville}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-xs text-gray-500 mb-1.5">Arrivée</Text>
        <View className="flex-row flex-wrap gap-2 mb-3.5">
          {destinations.map((d) => (
            <TouchableOpacity
              key={d.id}
              onPress={() => setArrivee(d.ville)}
              className={`px-3 py-1.5 rounded-full border ${arrivee === d.ville ? 'bg-primary border-primary' : 'border-gray-300'}`}
            >
              <Text className={`text-[13px] ${arrivee === d.ville ? 'text-white font-semibold' : 'text-gray-700'}`}>{d.ville}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-xs text-gray-500 mb-1.5">Date {type === 'aller_retour' ? 'aller' : ''}</Text>
        <TouchableOpacity
          onPress={() => setAfficherDatePicker('aller')}
          className="flex-row items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 mb-3.5"
        >
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-900">{dateISO(date)}</Text>
        </TouchableOpacity>

        {type === 'aller_retour' && (
          <>
            <Text className="text-xs text-gray-500 mb-1.5">Date retour</Text>
            <TouchableOpacity
              onPress={() => setAfficherDatePicker('retour')}
              className="flex-row items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 mb-3.5"
            >
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-900">{dateISO(dateRetour)}</Text>
            </TouchableOpacity>
          </>
        )}

        {afficherDatePicker && (
          <DateTimePicker
            value={afficherDatePicker === 'aller' ? date : dateRetour}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, selectionnee) => {
              setAfficherDatePicker(null);
              if (!selectionnee) return;
              if (afficherDatePicker === 'aller') setDate(selectionnee);
              else setDateRetour(selectionnee);
            }}
          />
        )}

        <TouchableOpacity onPress={rechercher} className="flex-row gap-2 bg-primary rounded-lg py-3.5 items-center justify-center">
          <Ionicons name="search" size={16} color="#fff" />
          <Text className="text-white font-semibold text-sm">Rechercher</Text>
        </TouchableOpacity>
      </View>

      {rechercheEffectuee && (
        <View className="mt-5">
          {chargement ? (
            <ActivityIndicator color="#D80010" style={{ marginTop: 20 }} />
          ) : (
            <>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Trajet aller</Text>
              {resultatsAller.map((v) => (
                <VoyageCarte key={v.id} voyage={v} selectionne={voyageAllerChoisi?.id === v.id} onPress={() => choisirAller(v)} />
              ))}
              {resultatsAller.length === 0 && <Text className="text-[13px] text-gray-400 text-center py-4">Aucun voyage trouvé.</Text>}

              {type === 'aller_retour' && voyageAllerChoisi && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-2 mt-4">Trajet retour</Text>
                  {resultatsRetour.map((v) => (
                    <VoyageCarte key={v.id} voyage={v} selectionne={false} onPress={() => choisirRetour(v)} />
                  ))}
                  {resultatsRetour.length === 0 && <Text className="text-[13px] text-gray-400 text-center py-4">Aucun voyage trouvé.</Text>}
                </>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function VoyageCarte({ voyage, selectionne, onPress }: { voyage: Voyage; selectionne: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-white rounded-2xl border p-3.5 mb-2.5 ${selectionne ? 'border-primary' : 'border-gray-200'}`}
    >
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm font-semibold text-gray-900">
          {voyage.trajet.depart.ville} → {voyage.trajet.arrivee.ville}
        </Text>
        <Text className="text-xs text-gray-500">{voyage.places_disponibles} places</Text>
      </View>
      <Text className="text-xs text-gray-500 mb-1">
        {new Date(voyage.date_heure_depart).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {voyage.classe.nom}
      </Text>
      <Text className="text-sm font-semibold text-gray-900">{voyage.tarif.prix_adulte} FCFA</Text>
    </TouchableOpacity>
  );
}