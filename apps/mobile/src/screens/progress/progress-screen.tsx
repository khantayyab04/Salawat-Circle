import {
  ActivityChart,
  AmountText,
  AppScreen,
  GoalSheet,
  SectionLabel,
  SegmentedControl,
  StatCard,
  Surface,
} from "@/components";
import { AppHeader } from "@/components/app-header";
import { useEntries } from "@/lib/entries";
import { PROGRESS_RANGES, type ProgressRange } from "@/lib/progress-series";
import { formatAppNumber, useTranslation } from "@/localization";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import Activity from "lucide-react-native/icons/activity";
import Calendar from "lucide-react-native/icons/calendar";
import Flame from "lucide-react-native/icons/flame";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import Target from "lucide-react-native/icons/target";
import Trophy from "lucide-react-native/icons/trophy";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

const rangeLabels = {
  week: "progressRangeWeek",
  month: "progressRangeMonth",
  year: "progressRangeYear",
  all: "progressRangeAll",
} as const;

const periodLabels = {
  week: "progressPeriodWeek",
  month: "progressPeriodMonth",
  year: "progressPeriodYear",
  all: "progressPeriodAll",
} as const;

const chartTitles = {
  week: "progressChartWeek",
  month: "progressChartMonth",
  year: "progressChartYear",
  all: "progressChartAll",
} as const;

export function ProgressScreen() {
  const { t, localeTag } = useTranslation();
  const { colors } = useAppTheme();
  const entries = useEntries();

  const [range, setRange] = useState<ProgressRange>("week");
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalFailed, setGoalFailed] = useState(false);

  const series = entries.progressSeries;
  const failed = entries.progressFailed;
  const loadSeries = entries.loadProgressSeries;

  useEffect(() => {
    // A failed load keeps the previous series on screen; the store records the
    // failure so the notice below can explain that it may be out of date.
    void loadSeries(range).catch(() => {});
  }, [loadSeries, range]);

  // Totals travel as strings so lifetime sums stay exact; BigInt keeps that
  // exactness all the way into the formatter.
  const saveGoal = async (amount: number | null) => {
    setGoalFailed(false);
    try {
      await (amount === null ? entries.clearGoal() : entries.setGoal(amount));
      setGoalOpen(false);
      // The goal changes which days count as achieved, so the series is stale.
      void loadSeries(range).catch(() => {});
    } catch {
      setGoalFailed(true);
    }
  };

  const number = (value: string) => formatAppNumber(BigInt(value), localeTag);
  const hasGoalDays = Boolean(series && series.goalDays !== "0");

  return (
    <AppScreen
      floatingTabBar
      header={
        <AppHeader subtitle={t("headerProgressEyebrow")} title={t("appName")} />
      }
    >
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <SegmentedControl
          onChange={setRange}
          options={PROGRESS_RANGES.map((value) => ({
            value,
            label: t(rangeLabels[value]),
          }))}
          style={{ flex: 1 }}
          value={range}
        />
        <Pressable
          accessibilityLabel={t("progressEditGoal")}
          accessibilityRole="button"
          onPress={() => setGoalOpen(true)}
          style={{
            minHeight: 44,
            minWidth: 44,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <SlidersHorizontal color={colors.textSecondary} size={18} />
        </Pressable>
      </View>

      {failed ? (
        <Surface tone="muted">
          <SectionLabel tone="gold">{t("progressSeriesFailed")}</SectionLabel>
        </Surface>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard
          caption={
            range === "week"
              ? t("progressActiveStreak")
              : t("progressLongestStreak")
          }
          icon={<Flame color={colors.gold} size={20} />}
          value={t("progressStreakDays", {
            count: String(
              range === "week"
                ? (series?.currentStreak ?? 0)
                : (series?.longestStreak ?? 0),
            ),
          })}
        />
        <StatCard
          caption={t("progressAllTimeTotal")}
          icon={<Trophy color={colors.primary} size={20} />}
          value={number(entries.summary.allTimeTotal)}
        />
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard
          caption={t(periodLabels[range])}
          icon={<Calendar color={colors.textPrimary} size={20} />}
          value={number(series?.total ?? "0")}
        />
        <StatCard
          caption={hasGoalDays ? t("progressGoalsMet") : t("progressNoGoalSet")}
          icon={<Target color={colors.gold} size={20} />}
          value={
            hasGoalDays && series
              ? `${number(series.achievedGoalDays)} / ${number(series.goalDays)}`
              : "—"
          }
        />
      </View>

      <Surface style={{ gap: spacing.xl }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
        >
          <Text
            numberOfLines={2}
            style={[typography.cardTitle, { color: colors.textPrimary, flex: 1 }]}
          >
            {t(chartTitles[range])}
          </Text>
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.sm,
              backgroundColor: colors.primarySoft,
              flexShrink: 1,
            }}
          >
            <SectionLabel numberOfLines={1} tone="primary">
              {t("progressChartTotal", {
                amount: number(series?.total ?? "0"),
              })}
            </SectionLabel>
          </View>
        </View>

        <ActivityChart
          bars={(series?.buckets ?? []).map((bucket) => ({
            label: bucket.label,
            total: bucket.total,
            goalReached: bucket.goalReached,
            current: bucket.future,
          }))}
          emptyLabel={t("progressChartEmpty")}
        />
      </Surface>

      <Surface padding="none" style={{ overflow: "hidden" }}>
        <View style={{ padding: spacing.xl, paddingBottom: spacing.md }}>
          <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
            {t("progressHistoryTitle")}
          </Text>
        </View>

        {(series?.buckets ?? [])
          .filter((bucket) => !bucket.future)
          .slice()
          .reverse()
          .map((bucket) => (
            <View
              key={bucket.start}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.lg,
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.lg,
                borderTopColor: colors.border,
                borderTopWidth: 1,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    bucket.goalReached === true
                      ? colors.primarySoft
                      : colors.surfaceMuted,
                }}
              >
                <Activity
                  color={
                    bucket.goalReached === true
                      ? colors.primary
                      : colors.textSecondary
                  }
                  size={14}
                />
              </View>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text
                  numberOfLines={1}
                  style={[typography.bodyStrong, { color: colors.textPrimary }]}
                >
                  {bucket.label}
                </Text>
                <SectionLabel size="small">
                  {bucket.goalReached === null
                    ? t("progressRecorded")
                    : bucket.goalReached
                      ? t("progressGoalReached")
                      : t("progressBelowGoal")}
                </SectionLabel>
              </View>
              <AmountText value={number(bucket.total)} variant="amount" />
            </View>
          ))}
      </Surface>

      <GoalSheet
        busy={entries.busy}
        copy={{
          title: t("goalTitle"),
          subtitle: t("goalSubtitle"),
          enableLabel: t("goalEnableLabel"),
          enableHint: t("goalEnableHint"),
          unit: t("goalUnit"),
          save: t("goalSave"),
          close: t("commonCancel"),
          invalid: t("entryAmountInvalid"),
          failed: t("goalSaveFailed"),
        }}
        currentGoal={entries.summary.todayGoal}
        failed={goalFailed}
        onClose={() => setGoalOpen(false)}
        onSave={(amount) => void saveGoal(amount)}
        visible={goalOpen}
      />
    </AppScreen>
  );
}
