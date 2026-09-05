import { useTranslation } from "@/localization";
import { AccountButton } from "@/ui";
import { Stack } from "expo-router/stack";

export default function ProgressLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t("tabsProgress"),
          headerLargeTitle: true,
          headerRight: () => <AccountButton label={t("accountTitle")} />,
        }}
      />
    </Stack>
  );
}
