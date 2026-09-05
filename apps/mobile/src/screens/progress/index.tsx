import { space } from "@/design-system";
import { buildDailyProgress } from "@/lib/entries/progress";
import {
  calculateGoalRate,
  calculateStreaks,
  describeMilestone,
} from "@/lib/entries/progress-metrics";
import { parseGoalAmount, useEntries } from "@/lib/entries";
import { formatAppDate, formatAppNumber, useTranslation } from "@/localization";
import { radius, useAppTheme } from "@/theme";
import {
  Banner,
  Button,
  NumberField,
  SegmentedControl,
  Text,
} from "@/ui";
import { BottomSheet, Column, Host, Slider } from "@expo/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, View } from "react-native";

function DailyBars({
  days,
  goal,
}: {
  days: ReturnType<typeof buildDailyProgress>;
  goal: string | null;
}) {
  const { colors } = useAppTheme();
  const highest = Math.max(
    1,
    ...days.map((day) => Number(day.total)),
    goal ? Number(goal) : 0,
  );
  return (
    <View
      accessibilityLabel={days
        .map((day) => `${day.date}: ${day.total}`)
        .join(". ")}
      style={{
        minHeight: 144,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: space.sm,
        padding: space.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
      }}
    >
      {days.map((day) => (
        <View key={day.date} style={{ flex: 1, alignItems: "center", gap: space.sm }}>
          <View
            style={{
              width: "100%",
              maxWidth: 24,
              height: Math.max(6, (Number(day.total) / highest) * 92),
              borderRadius: 9999,
              backgroundColor: colors.primary,
            }}
          />
          <Text variant="caption">{day.date.slice(-2)}</Text>
        </View>
      ))}
    </View>
  );
}

function GoalSheet({
  visible,
  goal,
  busy,
  onDismiss,
  onSave,
  onClear,
}: {
  visible: boolean;
  goal: string | null;
  busy: boolean;
  onDismiss: () => void;
  onSave: (amount: number) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(goal ?? "100");
  const [error, setError] = useState<string>();
  const parsedAmount = useMemo(() => {
    try {
      return parseGoalAmount(amount);
    } catch {
      return 100;
    }
  }, [amount]);
  const save = async () => {
    try {
      await onSave(parseGoalAmount(amount));
      onDismiss();
    } catch {
      setError(t("goalSaveFailed"));
    }
  };
  return (
    <Host matchContents>
      <BottomSheet isPresented={visible} onDismiss={onDismiss} snapPoints={["half"]}>
        <Column spacing={16}>
          <Text variant="title">{t("goalTitle")}</Text>
          <View accessibilityLabel={t("goalSliderLabel")} accessibilityRole="adjustable">
            <Slider
              max={10_000}
              min={1}
              onValueChange={(value) => setAmount(String(value))}
              step={100}
              value={Math.min(parsedAmount, 10_000)}
            />
          </View>
          <NumberField
            error={error}
            label={t("goalAmountLabel")}
            onChangeText={setAmount}
            value={amount}
          />
          <Button
            disabled={!amount.trim()}
            label={t("goalSave")}
            loading={busy}
            onPress={() => void save()}
          />
          <Button
            label={t("goalClear")}
            loading={busy}
            onPress={() => void onClear().then(onDismiss)}
            variant="tertiary"
          />
        </Column>
      </BottomSheet>
    </Host>
  );
}

export function ProgressScreen() {
  const { t, localeTag } = useTranslation();
  const entries = useEntries();
  const { colors } = useAppTheme();
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"week" | "month" | "all">("week");
  const days = buildDailyProgress(entries.entries);
  const loadProgressOverview = entries.loadProgressOverview;
  const loadedTimeZone = useRef<string | null>(null);
  useEffect(() => {
    if (
      !loadProgressOverview ||
      !entries.timeZone ||
      loadedTimeZone.current === entries.timeZone
    ) {
      return;
    }
    loadedTimeZone.current = entries.timeZone;
    void loadProgressOverview(35).catch(() => undefined);
  }, [entries.timeZone, loadProgressOverview]);
  const overviewDays =
    entries.progressOverview?.daily.map((day) => ({
      date: day.date,
      total: day.total,
      entryCount: days.find((candidate) => candidate.date === day.date)
        ?.entryCount ?? 0,
      goal: day.goal,
      goalReached: day.goalReached,
    })) ?? days;
  const chartDays = overviewDays.slice(-7);
  const streaks = calculateStreaks(overviewDays);
  const goalRate = calculateGoalRate(
    overviewDays.map((day) => ({
      total: day.total,
      goal:
        "goal" in day &&
        (typeof day.goal === "string" || day.goal === null)
          ? day.goal
          : entries.summary.todayGoal,
    })),
  );
  const milestone = describeMilestone(entries.summary.allTimeTotal);
  const selectedEntries = entries.entries.filter(
    (entry) => entry.entryDate === selectedDate,
  );

  if (entries.offlineLoadErrorCode) {
    return (
      <View style={{ flex: 1, padding: space.xxl }}>
        <Banner
          body={t("stateOfflineEmptyBody")}
          title={t("stateOfflineEmptyTitle")}
          tone="error"
        />
      </View>
    );
  }

  return (
    <>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: space.lg,
          paddingHorizontal: space.lg,
          paddingVertical: space.xxl,
        }}
        data={days}
        keyExtractor={(day) => day.date}
        ListHeaderComponent={
          <View style={{ gap: space.lg }}>
            <Text accessibilityRole="header" variant="largeTitle">
              {t("progressTitle")}
            </Text>
            <SegmentedControl
              onChange={setView}
              options={[
                { label: t("progressWeek"), value: "week" },
                { label: t("progressMonth"), value: "month" },
                { label: t("progressAllTime"), value: "all" },
              ]}
              value={view}
            />
            {entries.syncState !== "idle" ? (
              <Banner
                body={t("syncPendingBody")}
                title={t("syncPendingTitle")}
              />
            ) : null}
            <View style={{ gap: space.sm }}>
              <Text variant="headline">
                {view === "week"
                  ? t("progressWeek")
                  : view === "month"
                    ? t("progressMonth")
                    : t("progressAllTime")}
              </Text>
              {view === "week" ? (
                <DailyBars days={chartDays} goal={entries.summary.todayGoal} />
              ) : view === "month" ? (
                <View
                  accessibilityLabel={t("progressMonth")}
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: space.sm,
                    padding: space.lg,
                    borderRadius: radius.lg,
                    backgroundColor: colors.surface,
                  }}
                >
                  {days.slice(0, 31).map((day) => (
                    <View
                      key={day.date}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: radius.pill,
                        backgroundColor:
                          Number(day.total) >= Number(entries.summary.todayGoal ?? 1)
                            ? colors.award
                            : Number(day.total) > 0
                              ? colors.primary
                              : colors.surfaceMuted,
                      }}
                    />
                  ))}
                </View>
              ) : (
                <View style={{ gap: space.sm }}>
                  <Text variant="headline">
                    {formatAppNumber(BigInt(entries.summary.allTimeTotal), localeTag)}
                  </Text>
                  <Text variant="secondary">{t("todayTotal")}</Text>
                  <View
                    style={{
                      gap: space.xs,
                      padding: space.lg,
                      borderRadius: radius.lg,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text variant="caption">{t("progressMilestone")}</Text>
                    <Text variant="headline">
                      {t("progressNextMilestone", {
                        amount: formatAppNumber(BigInt(milestone.next), localeTag),
                      })}
                    </Text>
                    <Text variant="secondary">{`${milestone.progress}%`}</Text>
                  </View>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: space.md }}>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Text variant="caption">{t("progressConsistency")}</Text>
                  <Text variant="headline">
                    {t("progressStreak", { count: streaks.current })}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Text variant="caption">{t("todayGoalDays")}</Text>
                  <Text variant="headline">
                    {t("progressGoalRate", {
                      achieved: goalRate.achieved,
                      eligible: goalRate.eligible,
                    })}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("progressGoalOpen")}
              onPress={() => setGoalSheetOpen(true)}
              style={({ pressed }) => ({
                gap: space.xs,
                padding: space.lg,
                borderRadius: radius.lg,
                backgroundColor: entries.summary.todayGoal
                  ? colors.awardFill
                  : colors.surfaceMuted,
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text variant="headline">
                {entries.summary.todayGoal
                  ? `${t("todayGoal")}: ${formatAppNumber(
                      BigInt(entries.summary.todayGoal),
                      localeTag,
                    )}`
                  : t("todayNoGoal")}
              </Text>
              <Text variant="secondary">
                {entries.summary.eligibleGoalDays !== "0"
                  ? `${t("todayGoalDays")}: ${entries.summary.achievedDays}/${entries.summary.eligibleGoalDays}`
                  : t("todayNoGoalDay")}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: space.lg }}>
              <View style={{ flex: 1, gap: space.xs }}>
                <Text variant="caption">{t("todayWeek")}</Text>
                <Text variant="title">
                  {formatAppNumber(BigInt(entries.summary.weekTotal), localeTag)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: space.xs }}>
                <Text variant="caption">{t("todayTotal")}</Text>
                <Text variant="title">
                  {formatAppNumber(BigInt(entries.summary.allTimeTotal), localeTag)}
                </Text>
              </View>
            </View>
            <Text variant="title">{t("progressHistory")}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ gap: space.sm, paddingVertical: space.lg }}>
            <Text variant="headline">{t("todayHistoryEmpty")}</Text>
            <Text variant="secondary">{t("stateEmptyBody")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.date}. ${item.total}. ${t("progressEntries", {
              count: item.entryCount,
            })}`}
            onPress={() => setSelectedDate(item.date)}
            style={({ pressed }) => ({
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <Text>{formatAppDate(new Date(`${item.date}T00:00:00`), localeTag, entries.timeZone)}</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text variant="headline">
                {formatAppNumber(BigInt(item.total), localeTag)}
              </Text>
              <Text variant="caption">
                {t("progressEntries", { count: item.entryCount })}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <GoalSheet
        busy={entries.busy}
        goal={entries.summary.todayGoal}
        onClear={entries.clearGoal}
        onDismiss={() => setGoalSheetOpen(false)}
        onSave={entries.setGoal}
        visible={goalSheetOpen}
      />
      <Host matchContents>
        <BottomSheet
          isPresented={selectedDate !== null}
          onDismiss={() => setSelectedDate(null)}
          snapPoints={["half", "full"]}
        >
          <Column spacing={16}>
            <Text variant="title">{selectedDate ?? ""}</Text>
            {selectedEntries.map((entry) => (
              <View
                key={entry.id}
                style={{
                  minHeight: 48,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="headline">
                  {formatAppNumber(BigInt(entry.amount), localeTag)}
                </Text>
                <Button
                  label={t("entryDelete")}
                  onPress={() => void entries.delete(entry.id)}
                  variant="tertiary"
                />
              </View>
            ))}
          </Column>
        </BottomSheet>
      </Host>
    </>
  );
}
