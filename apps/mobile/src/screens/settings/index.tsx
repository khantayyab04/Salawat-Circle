import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
} from "@/components";
import { useAuth } from "@/lib/auth";
import { useTranslation, type LanguagePreference } from "@/localization";
import { spacing } from "@/theme";
import Constants from "expo-constants";
import { Host, List, ListItem, Picker } from "@expo/ui";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

export function SettingsScreen() {
  const { t, preference, setPreference } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace("/welcome");
    } catch {
      // The provider still performs local cleanup and exposes a stable error.
    }
  };
  const confirmSignOutEverywhere = () => {
    Alert.alert(
      t("settingsSignOutEverywhereConfirmTitle"),
      t("settingsSignOutEverywhereConfirmBody"),
      [
        { text: t("commonCancel"), style: "cancel" },
        {
          text: t("settingsSignOutEverywhere"),
          style: "destructive",
          onPress: () => {
            void auth.signOutEverywhere().then(() => router.replace("/welcome")).catch(() => {
              // The provider exposes a stable localized error.
            });
          },
        },
      ],
    );
  };
  return (
    <AppScreen>
      <AppCard>
        <AppText variant="bodyStrong">{t("settingsLanguage")}</AppText>
        <AppText variant="caption">{t("settingsLanguageHint")}</AppText>
        <Host matchContents>
          <Picker<LanguagePreference>
            appearance="menu"
            selectedValue={preference}
            onValueChange={setPreference}
            testID="language-picker"
          >
            <Picker.Item label={t("settingsLanguageSystem")} value="system" />
            <Picker.Item label={t("settingsLanguageGerman")} value="de" />
            <Picker.Item label={t("settingsLanguageEnglish")} value="en" />
          </Picker>
        </Host>
      </AppCard>
      <Host matchContents>
        <List>
          <ListItem onPress={() => router.push("/settings/profile")}>
            {t("settingsProfile")}
          </ListItem>
          <ListItem onPress={() => router.push("/settings/reminder")}>
            {t("settingsReminder")}
          </ListItem>
          <ListItem onPress={() => router.push("/settings/privacy")}>
            {t("settingsPrivacy")}
          </ListItem>
          <ListItem onPress={() => router.push("/settings/legal")}>
            {t("settingsLegal")}
          </ListItem>
          <ListItem onPress={() => router.push("/settings/support")}>
            {t("settingsSupport")}
          </ListItem>
        </List>
      </Host>
      {auth.errorCode === "SIGN_OUT_FAILED" ? (
        <AppText accessibilityLiveRegion="polite">
          {t("settingsSignOutFailed")}
        </AppText>
      ) : null}
      <AppButton
        label={t("settingsSignOutEverywhere")}
        loading={auth.busy}
        variant="secondary"
        onPress={confirmSignOutEverywhere}
      />
      <AppButton
        label={t("settingsSignOut")}
        loading={auth.busy}
        variant="destructive"
        onPress={() => void handleSignOut()}
      />
      <AppText variant="caption">{`${t("settingsVersion")}: ${
        Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0"
      }`}</AppText>
    </AppScreen>
  );
}

export function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppButton disabled label={t("privacyExport")} variant="secondary" />
      <AppButton disabled label={t("privacyDelete")} variant="destructive" />
    </AppScreen>
  );
}
export function LegalScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppCard style={{ gap: spacing.lg }}>
        <AppText>{t("legalPrivacy")}</AppText>
        <AppText>{t("legalTerms")}</AppText>
        <AppText>{t("legalImprint")}</AppText>
      </AppCard>
    </AppScreen>
  );
}
export function SupportScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppCard>
        <AppText>{t("supportBody")}</AppText>
      </AppCard>
    </AppScreen>
  );
}
