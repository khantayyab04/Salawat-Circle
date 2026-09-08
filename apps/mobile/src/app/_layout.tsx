import { AuthProvider, useAuth } from "@/lib/auth";
import {
  createDemoEntriesGateway,
  createDemoGroupsGateway,
} from "@/lib/demo-gateways";
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
import { useCallback, useMemo } from "react";

function RootNavigator() {
  const { status, userId } = useAuth();
  const router = useRouter();

  // A local preview of the signed-in screens without a backend. It is gated on
  // a development build AND an explicit environment flag, so it can never be
  // reached in a release.
  const localPreview =
    process.env.NODE_ENV !== "production" &&
    process.env.EXPO_PUBLIC_LOCAL_DEMO === "true";
  const appReady = status === "ready" || localPreview;
  const providerAccountId = localPreview ? "local-ui-preview" : userId;
  const demoEntriesGateway = useMemo(
    () => (localPreview ? createDemoEntriesGateway() : undefined),
    [localPreview],
  );
  const demoGroupsGateway = useMemo(
    () => (localPreview ? createDemoGroupsGateway() : undefined),
    [localPreview],
  );

  const openToday = useCallback(() => router.replace("/today"), [router]);
  const onboardingRequired =
    status === "profile_required" || status === "consent_required";
  return (
    <>
      <ReminderProvider
        accountId={status === "ready" ? userId : null}
        onOpenToday={openToday}
      >
        <EntriesProvider
          accountId={providerAccountId}
          enabled={appReady}
          gateway={demoEntriesGateway}
        >
          <GroupsProvider
            accountId={providerAccountId}
            enabled={appReady}
            gateway={demoGroupsGateway}
            onlineCheck={localPreview ? async () => true : undefined}
          >
            <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Protected guard={status === "signed_out"}>
              <Stack.Screen name="welcome" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={onboardingRequired}>
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={appReady}>
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
