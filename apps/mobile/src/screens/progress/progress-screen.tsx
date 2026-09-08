import {
  ActivityChart,
  AppScreen,
  AppButton,
  GoalSheet,
  StateFeedback,
  SectionLabel,
  SegmentedControl,
  StatCard,
  Surface,
} from "@/components";
import { AppHeader } from "@/components/app-header";
import { useEntries } from "@/lib/entries";
import { formatProgressBucketLabel, PROGRESS_RANGES, type ProgressRange } from "@/lib/progress-series";
import { formatAppNumber, useTranslation } from "@/localization";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import Calendar from "lucide-react-native/icons/calendar";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import Target from "lucide-react-native/icons/target";
import Trophy from "lucide-react-native/icons/trophy";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { AppState, Pressable, Text, View } from "react-native";

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
  const router = useRouter();

  const [range, setRange] = useState<ProgressRange>(entries.progressRange ?? "week");
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalFailed, setGoalFailed] = useState(false);

  const pending = entries.pendingCount > 0 || entries.failedCount > 0 || entries.syncState === "conflict";
  const series = !pending && entries.progressSeries?.range === range ? entries.progressSeries : null;
  const failed = entries.progressFailed;
  const loadSeries = entries.loadProgressSeries;

  const refresh = entries.refresh;
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]));

  useEffect(() => {
    if (!entries.timeZone || entries.viewState === "loading" || entries.viewState === "error" ||
        entries.busy || !entries.online || pending) return;
    void loadSeries(range).catch(() => {});
  }, [loadSeries, range, entries.timeZone, entries.viewState, entries.progressRevision, entries.busy, entries.online, pending]);

  // Totals travel as strings so lifetime sums stay exact; BigInt keeps that
  // exactness all the way into the formatter.
  const saveGoal = async (amount: number | null) => {
    setGoalFailed(false);
    try {
      await (amount === null ? entries.clearGoal() : entries.setGoal(amount));
      setGoalOpen(false);
    } catch {
      setGoalFailed(true);
    }
  };

  const number = (value: string) => formatAppNumber(BigInt(value), localeTag);
  const hasGoalDays = Boolean(series && series.goalDays !== "0");

  if (entries.viewState === "loading" || entries.viewState === "error") {
    return <AppScreen floatingTabBar header={<AppHeader subtitle={t("headerProgressEyebrow")} title={t("appName")} />}>
      <StateFeedback state={entries.viewState} />
      {entries.viewState === "error" ? <AppButton label={t("commonRetry")} onPress={() => void refresh()} /> : null}
    </AppScreen>;
  }

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

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard
          caption={t("todayGoal")}
          icon={<Target color={colors.gold} size={20} />}
          value={entries.summary.todayGoal ? number(entries.summary.todayGoal) : "—"}
        />
        <StatCard
          caption={t("progressAllTimeTotal")}
          icon={<Trophy color={colors.primary} size={20} />}
          value={number(entries.summary.allTimeTotal)}
        />
      </View>

      {pending ? (
        <Surface tone="muted">
          <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{t("progressAwaitingSyncTitle")}</Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>{t("progressAwaitingSyncBody")}</Text>
        </Surface>
      ) : !entries.online && series ? <Surface tone="muted"><Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>{t("progressSyncNotice")}</Text></Surface> : null}
      {failed ? <Surface tone="muted"><Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>{t("progressSeriesFailed")}</Text><AppButton label={t("commonRetry")} variant="secondary" onPress={() => void loadSeries(range).catch(() => {})} /></Surface> : null}
      {!series && !failed && !pending ? <StateFeedback state={entries.online ? "loading" : "offlineEmpty"} /> : null}
      {series ? <>
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
          statusLabels={{ reached: t("progressReachedGoal"), below: t("progressBelowGoal"), recorded: t("progressRecorded"), future: t("progressFuture"), current: t("progressCurrentPeriod") }}
          bars={(series?.buckets ?? []).map((bucket) => ({
            label: formatProgressBucketLabel(bucket.start < series.periodStart ? series.periodStart : bucket.start, range, localeTag),
            total: bucket.total,
            goalTotal: bucket.goalTotal,
            goalReached: bucket.goalReached,
            future: bucket.future,
            current: bucket.start === series.today,
          }))}
          emptyLabel={t("progressChartEmpty")}
        />
      </Surface>

      </> : null}

      <AppButton label={t("todayHistory")} variant="secondary" onPress={() => router.push("/progress/history")} />

      <GoalSheet
        busy={entries.busy}
        copy={{
          title: t("goalTitle"),
          subtitle: t("goalSubtitle"),
          enableLabel: t("goalEnableLabel"),
          enableHint: t("goalEnableHint"),
          unit: t("goalUnit"),
          sliderLabel: t("goalSliderLabel"),
          sliderHint: t("goalSliderHint"),
          amountLabel: t("goalAmountLabel"),
          amountHint: t("goalAmountHint"),
          save: t("goalSave"),
          clear: t("goalClear"),
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
