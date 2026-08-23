import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const COULEUR_PRIMAIRE = "#D80010"; // Couleur primaire (bleu)

export default function LayoutOnglets() {
    return (
        <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: COULEUR_PRIMAIRE }} >
            <Tabs.Screen name="index"
            options={{ title: "Rechercher", tabBarIcon: ({ color, size}) => <Ionicons name="search" color={color} size={size} /> }} 
            />
            <Tabs.Screen name="mes-reservations"
                options={{ title: "Mes réservations", tabBarIcon: ({ color, size}) => <Ionicons name="ticket-outline" color={color} size={size} /> }}
            />
            <Tabs.Screen name="compte"
                options={{ title: "Mon compte", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }}
            />
        </Tabs>
    )
}