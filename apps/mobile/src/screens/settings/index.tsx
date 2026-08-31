import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
} from "@/components";
import { useAuth } from "@/lib/auth";
import { useTranslation, type LanguagePreference } from "@/localization";
import { spacing } from "@/theme";
import { Host, List, ListItem, Picker } from "@expo/ui";
import { useRouter } from "expo-router";
import { useState } from "react";

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
        label={t("settingsSignOut")}
        loading={auth.busy}
        variant="destructive"
        onPress={() => void handleSignOut()}
      />
    </AppScreen>
  );
}

export function SettingsProfileScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  return (
    <AppScreen>
      <FormField
        label={t("profileNameLabel")}
        value={name}
        onChangeText={setName}
      />
      <FormField
        editable={false}
        label={t("profileTimezoneLabel")}
        value={Intl.DateTimeFormat().resolvedOptions().timeZone}
      />
      <AppButton disabled label={t("commonSave")} />
    </AppScreen>
  );
}
export function ReminderScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <FormField editable={false} label={t("reminderTimeLabel")} />
      <AppButton disabled label={t("commonSave")} />
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
      <AppButton disabled label={t("supportReport")} variant="secondary" />
      <AppButton disabled label={t("supportContact")} variant="secondary" />
    </AppScreen>
  );
}
