import { useAuth } from "@/lib/auth";
import { useTranslation, type LanguagePreference } from "@/localization";
import { Button, Screen, Section, Text } from "@/ui";
import { useAppTheme } from "@/theme";
import { Host, List, ListItem, Picker } from "@expo/ui";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

export function AccountScreen() {
  const { t, preference, setPreference } = useTranslation();
  const auth = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();
  const signOut = async () => {
    try {
      await auth.signOut();
      router.replace("/welcome");
    } catch {
      // The provider exposes stable localized error state.
    }
  };
  const signOutEverywhere = () => {
    Alert.alert(
      t("settingsSignOutEverywhereConfirmTitle"),
      t("settingsSignOutEverywhereConfirmBody"),
      [
        { text: t("commonCancel"), style: "cancel" },
        {
          text: t("settingsSignOutEverywhere"),
          style: "destructive",
          onPress: () => {
            void auth
              .signOutEverywhere()
              .then(() => router.replace("/welcome"))
              .catch(() => {
                // The provider exposes stable localized error state.
              });
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Text accessibilityRole="header" variant="largeTitle">
        {t("accountTitle")}
      </Text>
      <Section>
        <Text variant="headline">{t("settingsLanguage")}</Text>
        <Text variant="secondary">{t("settingsLanguageHint")}</Text>
        <Host matchContents>
          <Picker<LanguagePreference>
            appearance="menu"
            onValueChange={setPreference}
            selectedValue={preference}
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
          <Text accessibilityLiveRegion="polite" style={{ color: colors.error }}>
            {t("settingsSignOutFailed")}
          </Text>
        ) : null}
        <Button
          label={t("settingsSignOutEverywhere")}
          loading={auth.busy}
          onPress={signOutEverywhere}
          variant="secondary"
        />
        <Button
          label={t("settingsSignOut")}
          loading={auth.busy}
          onPress={() => void signOut()}
          variant="destructive"
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
