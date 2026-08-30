import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
  StateFeedback,
} from "@/components";
import { useSalawatActions, useSalawatEntries, useSalawatSummary } from "@/lib/hooks/use-salawat";
import { formatAppNumber, useTranslation } from "@/localization";
import { spacing, useAppTheme } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, View, useWindowDimensions } from "react-native";

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
  const { colors } = useAppTheme();
  const router = useRouter();

  const todayStr = new Date().toISOString().slice(0, 10);
  const { summary, refresh: refreshSummary } = useSalawatSummary(todayStr);
  const { entries, loadMore, hasMore, refresh: refreshEntries } = useSalawatEntries();

  const handleRefreshAll = () => {
    refreshSummary();
    refreshEntries();
  };

  const { addEntry, setGoal, removeEntry, actionLoading } = useSalawatActions(handleRefreshAll);

  const [amountInput, setAmountInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);

  const parsedAmount = parseInt(amountInput.trim(), 10);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 10000000;

  const handleAddSubmit = async () => {
    if (!isValidAmount) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    await addEntry(parsedAmount, todayStr, tz);
    setAmountInput("");
  };

  const handleSaveGoal = async () => {
    const parsedGoal = parseInt(goalInput.trim(), 10);
    if (!isNaN(parsedGoal) && parsedGoal >= 1 && parsedGoal <= 10000000) {
      await setGoal(todayStr, parsedGoal);
      setGoalInput("");
      setShowGoalForm(false);
    }
  };

  const handleDeactivateGoal = async () => {
    await setGoal(todayStr, null);
    setGoalInput("");
    setShowGoalForm(false);
  };

  const stacked = width < 360 || fontScale >= 1.3;

  const todayTotalVal = summary ? summary.today_total : 0;
  const allTimeVal = summary ? summary.all_time_total : 0;
  const weekVal = summary ? summary.week_total : 0;
  const goalVal = summary?.today_goal;

  const goalText = goalVal ? `${formatAppNumber(goalVal, localeTag)}` : t("todayNoGoal");
  const goalDaysText =
    summary && summary.eligible_goal_days > 0
      ? `${summary.achieved_days}/${summary.eligible_goal_days}`
      : t("todayNoGoalDay");

  return (
    <AppScreen>
      <AppCard>
        <AppText>{t("todayHeading")}</AppText>
        <AppText
          accessibilityLabel={`${formatAppNumber(todayTotalVal, localeTag)} Salawat`}
          variant="displayNumber"
        >
          {formatAppNumber(todayTotalVal, localeTag)}
        </AppText>

        <FormField
          accessibilityLabel={t("todayAddLabel")}
          keyboardType="number-pad"
          label={t("todayAddLabel")}
          hint={t("todayAddHint")}
          value={amountInput}
          onChangeText={setAmountInput}
        />

        <AppButton
          disabled={!isValidAmount || actionLoading}
          label={t("todaySubmit")}
          onPress={handleAddSubmit}
        />
      </AppCard>

      <AppText variant="title">{t("todayDashboard")}</AppText>
      <View
        style={{
          flexDirection: stacked ? "column" : "row",
          flexWrap: stacked ? "nowrap" : "wrap",
          gap: spacing.md,
        }}
      >
        <Metric label={t("todayTotal")} value={formatAppNumber(allTimeVal, localeTag)} />
        <Metric label={t("todayWeek")} value={formatAppNumber(weekVal, localeTag)} />
        <Pressable onPress={() => setShowGoalForm((prev) => !prev)} style={{ flex: 1 }}>
          <Metric label={t("todayGoal")} value={goalText} />
        </Pressable>
        <Metric label={t("todayGoalDays")} value={goalDaysText} />
      </View>

      {showGoalForm && (
        <AppCard style={{ gap: spacing.md }}>
          <AppText variant="title">{t("goalAdjustTitle")}</AppText>
          <FormField
            keyboardType="number-pad"
            label={t("todayGoal")}
            value={goalInput}
            onChangeText={setGoalInput}
          />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <AppButton
                label={t("goalSaveAction")}
                onPress={handleSaveGoal}
                disabled={actionLoading}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label={t("goalDeactivateAction")}
                variant="secondary"
                onPress={handleDeactivateGoal}
                disabled={actionLoading}
              />
            </View>
          </View>
        </AppCard>
      )}

      <AppText variant="title">{t("todayHistory")}</AppText>
      {entries.length === 0 ? (
        <AppCard>
          <AppText>{t("todayHistoryEmpty")}</AppText>
        </AppCard>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (hasMore) loadMore();
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <AppCard style={{ marginBottom: spacing.md, gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <AppText variant="bodyStrong">
                  {formatAppNumber(item.amount, localeTag)} Salawat
                </AppText>
                {item.local_state !== "synced" && (
                  <View
                    style={{
                      paddingHorizontal: spacing.xs,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor:
                        item.local_state === "conflict" ? colors.error : colors.accentMuted,
                    }}
                  >
                    <AppText variant="caption">
                      {item.local_state === "conflict"
                        ? t("statusConflictBadge")
                        : t("statusPendingBadge")}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText variant="caption">{item.entry_date}</AppText>
              <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xs }}>
                <AppButton
                  label={t("commonEdit")}
                  variant="ghost"
                  onPress={() =>
                    router.push({
                      pathname: "/entry/[id]/edit",
                      params: { id: item.id },
                    })
                  }
                />
                <AppButton
                  label={t("commonDelete")}
                  variant="ghost"
                  onPress={() => removeEntry(item.id)}
                />
              </View>
            </AppCard>
          )}
        />
      )}
    </AppScreen>
  );
}

export function EntryEditScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { refresh: refreshEntries } = useSalawatEntries();
  const { updateEntry, resolveConflict, actionLoading } = useSalawatActions(() => {
    refreshEntries();
  });

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [conflict, setConflict] = useState(false);

  const handleSave = async () => {
    const parsed = parseInt(amount.trim(), 10);
    if (!isNaN(parsed) && id && date) {
      try {
        await updateEntry(id, parsed, date);
        router.back();
      } catch {
        setConflict(true);
      }
    }
  };

  const handleKeepServer = async () => {
    if (id) {
      await resolveConflict(id, "keep_server");
      setConflict(false);
      router.back();
    }
  };

  const handleReapplyMine = async () => {
    if (id) {
      await resolveConflict(id, "reapply_mine");
      setConflict(false);
      router.back();
    }
  };

  return (
    <AppScreen>
      {conflict ? (
        <AppCard style={{ gap: spacing.md }}>
          <AppText variant="title">{t("conflictTitle")}</AppText>
          <AppText>{t("conflictBody")}</AppText>
          <AppButton
            label={t("conflictKeepServer")}
            onPress={handleKeepServer}
            disabled={actionLoading}
          />
          <AppButton
            label={t("conflictReapplyMine")}
            variant="secondary"
            onPress={handleReapplyMine}
            disabled={actionLoading}
          />
        </AppCard>
      ) : (
        <>
          <FormField
            keyboardType="number-pad"
            label={t("entryAmountLabel")}
            value={amount}
            onChangeText={setAmount}
          />
          <FormField
            label={t("entryDateLabel")}
            value={date}
            onChangeText={setDate}
          />
          <AppButton
            disabled={actionLoading || !amount || !date}
            label={t("commonSave")}
            onPress={handleSave}
          />
        </>
      )}
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
