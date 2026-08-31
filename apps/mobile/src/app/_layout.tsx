import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/localization";
import { AppThemeProvider } from "@/theme";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";

function RootNavigator() {
  const { status } = useAuth();
  const onboardingRequired =
    status === "profile_required" || status === "consent_required";
  return (
    <>
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={status === "signed_out"}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboardingRequired}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={status === "ready"}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="join/[token]" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <AppThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppThemeProvider>
    </I18nProvider>
  );
}
