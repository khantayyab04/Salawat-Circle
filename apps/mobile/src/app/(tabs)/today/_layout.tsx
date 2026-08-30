import { useTranslation } from "@/localization";
import { Stack } from "expo-router/stack";
export default function TodayLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: t("tabsToday"), headerLargeTitle: true }}
      />
    </Stack>
  );
}
