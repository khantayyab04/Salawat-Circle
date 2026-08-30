import { useTranslation } from "@/localization";
import { ConsentScreen } from "@/screens/auth";
import { Stack } from "expo-router/stack";
export default function ConsentRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("consentTitle") }} />
      <ConsentScreen />
    </>
  );
}
