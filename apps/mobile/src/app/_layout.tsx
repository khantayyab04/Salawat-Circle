import { AuthProvider, useAuth } from "@/lib/auth";
import { EntriesProvider } from "@/lib/entries";
import { GroupsProvider } from "@/lib/groups";
import { ReminderProvider } from "@/lib/reminder";
import { I18nProvider } from "@/localization";
import { AppThemeProvider } from "@/theme";
import { appFontAssets } from "@/theme/fonts.assets";
import { resolveFontGate } from "@/theme/fonts";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useCallback } from "react";

function RootNavigator() {
  const { status, userId } = useAuth();
  const router = useRouter();
  const openToday = useCallback(() => router.replace("/today"), [router]);
  const onboardingRequired =
    status === "profile_required" || status === "consent_required";
  return (
    <>
      <ReminderProvider
        accountId={status === "ready" ? userId : null}
        onOpenToday={openToday}
      >
        <EntriesProvider accountId={userId} enabled={status === "ready"}>
          <GroupsProvider accountId={userId} enabled={status === "ready"}>
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
              <Stack.Screen name="entry/[id]/edit" />
            </Stack.Protected>
            <Stack.Screen name="join/index" />
            <Stack.Screen name="join/[token]" />
            </Stack>
          </GroupsProvider>
        </EntriesProvider>
      </ReminderProvider>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFontAssets);
  const { ready } = resolveFontGate({ loaded: fontsLoaded, error: fontError });

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AppThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </AppThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
