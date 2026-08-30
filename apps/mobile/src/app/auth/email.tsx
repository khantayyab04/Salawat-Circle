import { useTranslation } from "@/localization";
import { EmailScreen } from "@/screens/auth";
import { Stack } from "expo-router/stack";
export default function EmailRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("authEmailTitle") }} />
      <EmailScreen />
    </>
  );
}
