import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
  StateFeedback,
} from "@/components";
import { useTranslation } from "@/localization";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

export function GroupsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <AppScreen>
      <AppButton
        label={t("groupsCreate")}
        onPress={() => router.push("/groups/create")}
      />
      <AppCard>
        <AppText variant="title">{t("groupsEmptyTitle")}</AppText>
        <AppText>{t("groupsEmptyBody")}</AppText>
      </AppCard>
    </AppScreen>
  );
}
export function GroupCreateScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  return (
    <AppScreen>
      <FormField
        label={t("groupNameLabel")}
        value={name}
        onChangeText={setName}
      />
      <AppButton disabled label={t("groupsCreate")} />
    </AppScreen>
  );
}
export function GroupDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AppScreen>
      <AppCard>
        <AppText variant="title">{t("groupTitle")}</AppText>
        <AppText>{t("groupRanking")}</AppText>
      </AppCard>
      <AppButton
        label={t("groupMembers")}
        variant="secondary"
        onPress={() =>
          router.push({ pathname: "/groups/[id]/members", params: { id } })
        }
      />
      <AppButton
        label={t("groupInvites")}
        variant="secondary"
        onPress={() =>
          router.push({ pathname: "/groups/[id]/invites", params: { id } })
        }
      />
    </AppScreen>
  );
}
export function GroupMembersScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <StateFeedback state="empty">
        <View />
      </StateFeedback>
      <AppButton disabled label={t("commonUnavailable")} variant="secondary" />
    </AppScreen>
  );
}
export function GroupInvitesScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <StateFeedback state="empty">
        <View />
      </StateFeedback>
      <AppButton disabled label={t("commonUnavailable")} variant="secondary" />
    </AppScreen>
  );
}
export function JoinScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppCard>
        <AppText variant="title">{t("joinTitle")}</AppText>
        <AppText>{t("joinBody")}</AppText>
      </AppCard>
      <AppButton disabled label={t("joinAction")} />
    </AppScreen>
  );
}
