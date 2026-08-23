import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../core/context/auth-context";
import { Stack } from "expo-router";

export default function LayoutRacine() {
    return (
        <AuthProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
            </Stack>
        </AuthProvider>
    )
}