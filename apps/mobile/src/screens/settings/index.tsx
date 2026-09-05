import { useAuth } from "@/lib/auth";
import { useTranslation, type LanguagePreference } from "@/localization";
import { Banner, Button, Card, Screen, Section, Text } from "@/ui";
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
    <Screen>
      <Section>
        <Text accessibilityRole="header" variant="title">
          {t("settingsLanguage")}
        </Text>
        <Text variant="secondary">{t("settingsLanguageHint")}</Text>
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
      </Section>
      <Host matchContents>
        <List>
          <ListItem onPress={() => router.push("/account/profile")}>
            {t("settingsProfile")}
          </ListItem>
          <ListItem onPress={() => router.push("/account/reminder")}>
            {t("settingsReminder")}
          </ListItem>
          <ListItem onPress={() => router.push("/account/privacy")}>
            {t("settingsPrivacy")}
          </ListItem>
          <ListItem onPress={() => router.push("/account/legal")}>
            {t("settingsLegal")}
          </ListItem>
          <ListItem onPress={() => router.push("/account/support")}>
            {t("settingsSupport")}
          </ListItem>
        </List>
      </Host>
      <Section>
        <Text accessibilityRole="header" variant="title">
          {t("settingsDangerZone")}
        </Text>
        {auth.errorCode === "SIGN_OUT_FAILED" ? (
          <Banner
            body={t("settingsSignOutFailed")}
            title={t("stateErrorTitle")}
            tone="error"
          />
        ) : null}
        <Button
          label={t("settingsSignOutEverywhere")}
          loading={auth.busy}
          variant="secondary"
          onPress={confirmSignOutEverywhere}
        />
        <Button
          label={t("settingsSignOut")}
          loading={auth.busy}
          variant="destructive"
          onPress={() => void handleSignOut()}
        />
      </Section>
      <Text variant="caption">{`${t("settingsVersion")}: ${
        Constants.expoConfig?.version ??
        Constants.nativeAppVersion ??
        t("settingsVersionUnavailable")
      }`}</Text>
    </Screen>
  );
}

export function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Card>
        <Button disabled label={t("privacyExport")} variant="secondary" />
      </Card>
      <Section>
        <Text accessibilityRole="header" variant="title">
          {t("settingsDangerZone")}
        </Text>
        <Button disabled label={t("privacyDelete")} variant="destructive" />
      </Section>
    </Screen>
  );
}

export function LegalScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Card>
        <Text>{t("legalPrivacy")}</Text>
        <Text>{t("legalTerms")}</Text>
        <Text>{t("legalImprint")}</Text>
      </Card>
    </Screen>
  );
}

export function SupportScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Card>
        <Text>{t("supportBody")}</Text>
      </Card>
    </Screen>
  );
}
