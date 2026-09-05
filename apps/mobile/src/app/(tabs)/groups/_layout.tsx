import { useTranslation } from "@/localization";
import { AccountButton } from "@/ui";
import { Stack } from "expo-router/stack";
export default function GroupsLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen
        name="index"
        options={{
          title: t("tabsGroups"),
          headerLargeTitle: true,
          headerRight: () => <AccountButton label={t("accountTitle")} />,
        }}
      />
      <Stack.Screen name="create" options={{ title: t("groupCreateTitle") }} />
      <Stack.Screen name="[id]/index" options={{ title: t("groupTitle") }} />
      <Stack.Screen name="[id]/manage" options={{ title: t("groupManage") }} />
      <Stack.Screen
        name="[id]/members"
        options={{ title: t("groupMembersTitle") }}
      />
      <Stack.Screen
        name="[id]/invites"
        options={{ title: t("groupInvitesTitle") }}
      />
    </Stack>
  );
}
