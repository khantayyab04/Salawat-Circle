import { useTranslation } from "@/localization";
import { CodeScreen } from "@/screens/auth";
import { Stack } from "expo-router/stack";
export default function CodeRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("authCodeTitle") }} />
      <CodeScreen />
    </>
  );
}
