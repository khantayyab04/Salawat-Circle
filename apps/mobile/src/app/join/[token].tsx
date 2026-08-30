import { useTranslation } from "@/localization";
import { JoinScreen } from "@/screens/main";
import { Stack } from "expo-router/stack";
export default function JoinRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("joinTitle") }} />
      <JoinScreen />
    </>
  );
}
