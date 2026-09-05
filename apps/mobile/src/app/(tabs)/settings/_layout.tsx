import { useTranslation } from "@/localization";
import { Stack } from "expo-router/stack";
export default function SettingsLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="profile" options={{ title: t("settingsProfile") }} />
      <Stack.Screen name="reminder" options={{ title: t("reminderTitle") }} />
      <Stack.Screen name="privacy" options={{ title: t("privacyTitle") }} />
      <Stack.Screen name="legal" options={{ title: t("legalTitle") }} />
      <Stack.Screen name="support" options={{ title: t("supportTitle") }} />
    </Stack>
  );
}
