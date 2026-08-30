import { useTranslation } from "@/localization";
import { EntryEditScreen } from "@/screens/main";
import { Stack } from "expo-router/stack";
export default function EntryEditRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("entryEditTitle") }} />
      <EntryEditScreen />
    </>
  );
}
