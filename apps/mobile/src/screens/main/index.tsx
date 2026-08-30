import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
  StateFeedback,
} from "@/components";
import { formatAppNumber, useTranslation } from "@/localization";
import { spacing } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View, useWindowDimensions } from "react-native";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <AppCard style={{ flex: 1, minWidth: 140 }}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </AppCard>
  );
}

export function TodayScreen() {
  const { t, localeTag } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const [amount, setAmount] = useState("");
  const stacked = width < 360 || fontScale >= 1.3;
  return (
    <AppScreen>
      <AppCard>
        <AppText>{t("todayHeading")}</AppText>
        <AppText
          accessibilityLabel={`${formatAppNumber(0, localeTag)} Salawat`}
          variant="displayNumber"
        >
          {formatAppNumber(0, localeTag)}
        </AppText>
        <FormField
          keyboardType="number-pad"
          label={t("todayAddLabel")}
          hint={t("todayAddHint")}
          value={amount}
          onChangeText={setAmount}
        />
        <AppButton disabled label={t("todaySubmit")} />
      </AppCard>
      <AppText variant="title">{t("todayDashboard")}</AppText>
      <View
        style={{
          flexDirection: stacked ? "column" : "row",
          flexWrap: stacked ? "nowrap" : "wrap",
          gap: spacing.md,
        }}
      >
        <Metric label={t("todayTotal")} value={formatAppNumber(0, localeTag)} />
        <Metric label={t("todayWeek")} value={formatAppNumber(0, localeTag)} />
        <Metric label={t("todayGoal")} value={t("todayNoGoal")} />
        <Metric label={t("todayGoalDays")} value={t("todayNoGoalDay")} />
      </View>
      <AppText variant="title">{t("todayHistory")}</AppText>
      <AppCard>
        <AppText>{t("todayHistoryEmpty")}</AppText>
      </AppCard>
    </AppScreen>
  );
}

export function EntryEditScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <FormField editable={false} label={t("entryAmountLabel")} />
      <FormField editable={false} label={t("entryDateLabel")} />
      <AppButton disabled label={t("commonSave")} />
    </AppScreen>
  );
}

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
