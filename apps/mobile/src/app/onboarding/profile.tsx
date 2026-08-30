import { useTranslation } from "@/localization";
import { ProfileOnboardingScreen } from "@/screens/auth";
import { Stack } from "expo-router/stack";
export default function ProfileRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("profileTitle") }} />
      <ProfileOnboardingScreen />
    </>
  );
}
