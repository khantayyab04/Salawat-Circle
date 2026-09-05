import {
  AppButton,
  AppScreen,
  AppSheet,
  SectionLabel,
  SettingsGroup,
  SettingsRow,
  Surface,
} from "@/components";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/auth/supabase-client";
import { createDemoSettingsGateway } from "@/lib/demo-gateways";
import {
  createSupabaseSettingsGateway,
  type SettingsProfile,
} from "@/lib/settings/settings-gateway";
import { useTranslation, type LanguagePreference } from "@/localization";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import Bell from "lucide-react-native/icons/bell";
import Check from "lucide-react-native/icons/check";
import FileText from "lucide-react-native/icons/file-text";
import Globe from "lucide-react-native/icons/globe";
import LogOut from "lucide-react-native/icons/log-out";
import Shield from "lucide-react-native/icons/shield";
import Smartphone from "lucide-react-native/icons/smartphone";
import User from "lucide-react-native/icons/user";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

const languageOptions: readonly {
  value: LanguagePreference;
  labelKey: "settingsLanguageSystem" | "settingsLanguageGerman" | "settingsLanguageEnglish";
}[] = [
  { value: "system", labelKey: "settingsLanguageSystem" },
  { value: "de", labelKey: "settingsLanguageGerman" },
  { value: "en", labelKey: "settingsLanguageEnglish" },
];

type SettingsGateway = { loadProfile(): Promise<SettingsProfile> };

export function SettingsScreen({ gateway }: { gateway?: SettingsGateway } = {}) {
  const { t, preference, setPreference } = useTranslation();
  const { colors } = useAppTheme();
  const auth = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  // Creating the client throws synchronously when the backend is not
  // configured, so it is resolved during render rather than inside the effect.
  const source = useMemo(() => {
    if (gateway) return gateway;
    // The local preview has no session, so a real request would never settle
    // and the card would stay on "loading" forever.
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.EXPO_PUBLIC_LOCAL_DEMO === "true"
    ) {
      return createDemoSettingsGateway();
    }
    try {
      return createSupabaseSettingsGateway(getSupabaseClient());
    } catch {
      return null;
    }
  }, [gateway]);

  useEffect(() => {
    if (!source) return;
    let active = true;
    void source
      .loadProfile()
      .then((loaded) => {
        if (active) setProfile(loaded);
      })
      .catch(() => {
        // The profile screen owns the retry; here the card simply stops
        // pretending to load so the rest of the account stays usable.
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [source]);

  const profileFailed = source === null || loadFailed;

  const languageLabel = t(
    languageOptions.find((option) => option.value === preference)?.labelKey ??
      "settingsLanguageSystem",
  );

  const signOut = async () => {
    setSignOutOpen(false);
    try {
      await auth.signOut();
      router.replace("/welcome");
    } catch {
      // The provider still performs local cleanup and exposes a stable error.
    }
  };

  const signOutEverywhere = async () => {
    setSignOutOpen(false);
    try {
      await auth.signOutEverywhere();
      router.replace("/welcome");
    } catch {
      // The provider exposes a stable localized error.
    }
  };

  return (
    <AppScreen
      floatingTabBar
      header={
        <AppHeader subtitle={t("headerAccountEyebrow")} title={t("appName")} />
      }
    >
      <Surface
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.xl }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
          }}
        >
          <Text
            style={[typography.displayNumber, { color: colors.textOnPrimary }]}
          >
            {profile?.displayName
              ? profile.displayName.slice(0, 1).toUpperCase()
              : "?"}
          </Text>
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text
            numberOfLines={2}
            style={[typography.title, { color: colors.textPrimary }]}
          >
            {profile?.displayName ??
              (profileFailed ? t("settingsProfile") : t("stateLoadingTitle"))}
          </Text>
          <SectionLabel tone="gold">
            {profile?.timeZone ??
              (profileFailed
                ? t("settingsProfileLoadFailed")
                : t("stateLoadingBody"))}
          </SectionLabel>
        </View>
      </Surface>

      <SettingsGroup>
        <SettingsRow
          icon={<User color={colors.primary} size={18} />}
          label={t("settingsProfile")}
          onPress={() => router.push("/settings/profile")}
          value={profile?.timeZone}
        />
        <SettingsRow
          icon={<Bell color={colors.primary} size={18} />}
          label={t("settingsReminder")}
          onPress={() => router.push("/settings/reminder")}
        />
        <SettingsRow
          icon={<Globe color={colors.primary} size={18} />}
          label={t("settingsLanguage")}
          onPress={() => setLanguageOpen(true)}
          value={languageLabel}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon={<Shield color={colors.primary} size={18} />}
          label={t("settingsPrivacy")}
          onPress={() => router.push("/settings/privacy")}
        />
        <SettingsRow
          icon={<FileText color={colors.primary} size={18} />}
          label={t("settingsLegal")}
          onPress={() => router.push("/settings/legal")}
        />
        <SettingsRow
          icon={<FileText color={colors.primary} size={18} />}
          label={t("settingsSupport")}
          onPress={() => router.push("/settings/support")}
        />
      </SettingsGroup>

      {auth.errorCode === "SIGN_OUT_FAILED" ? (
        <SectionLabel accessibilityLiveRegion="polite" tone="gold">
          {t("settingsSignOutFailed")}
        </SectionLabel>
      ) : null}

      <AppButton
        label={t("settingsSignOut")}
        loading={auth.busy}
        onPress={() => setSignOutOpen(true)}
        variant="destructive"
      />

      <SectionLabel style={{ textAlign: "center" }}>
        {`${t("settingsVersion")} ${
          Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0"
        }`}
      </SectionLabel>

      <AppSheet
        closeLabel={t("commonCancel")}
        onClose={() => setLanguageOpen(false)}
        title={t("settingsLanguage")}
        subtitle={t("settingsLanguageHint")}
        visible={languageOpen}
      >
        <SettingsGroup>
          {languageOptions.map((option) => (
            <SettingsRow
              key={option.value}
              label={t(option.labelKey)}
              onPress={() => {
                setPreference(option.value);
                setLanguageOpen(false);
              }}
              trailing={
                preference === option.value ? (
                  <Check color={colors.primary} size={18} />
                ) : (
                  <View style={{ width: 18 }} />
                )
              }
            />
          ))}
        </SettingsGroup>
      </AppSheet>

      <AppSheet
        closeLabel={t("commonCancel")}
        onClose={() => setSignOutOpen(false)}
        title={t("settingsSignOut")}
        visible={signOutOpen}
      >
        <SectionLabel>
          {t("settingsSignOutEverywhereConfirmBody")}
        </SectionLabel>
        <View style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
            }}
          >
            <LogOut color={colors.textSecondary} size={18} />
            <AppButton
              label={t("settingsSignOut")}
              loading={auth.busy}
              onPress={() => void signOut()}
              style={{ flex: 1 }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
            }}
          >
            <Smartphone color={colors.error} size={18} />
            <AppButton
              label={t("settingsSignOutEverywhere")}
              loading={auth.busy}
              onPress={() => void signOutEverywhere()}
              style={{ flex: 1 }}
              variant="destructive"
            />
          </View>
          <AppButton
            label={t("commonCancel")}
            onPress={() => setSignOutOpen(false)}
            variant="ghost"
          />
        </View>
      </AppSheet>
    </AppScreen>
  );
}
