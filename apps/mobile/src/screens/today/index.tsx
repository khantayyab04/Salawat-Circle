import {
  AppButton,
  AppCard,
  EntryRow,
  GoalSection,
  AppText,
  FormField,
  StateFeedback,
} from "@/components";
import {
  describeGoalProgress,
  parseEntryAmount,
  useEntries,
} from "@/lib/entries";
import { formatAppNumber, useTranslation } from "@/localization";
import { spacing, useAppTheme } from "@/theme";
import { useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";

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
  const { colors } = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const entries = useEntries();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [inputError, setInputError] = useState<string | undefined>();
  const stacked = width < 360 || fontScale >= 1.3;
  const goalProgress = describeGoalProgress(
    entries.summary.achievedDays,
    entries.summary.eligibleGoalDays,
  );

  const submit = async () => {
    let parsedAmount: number;
    try {
      parsedAmount = parseEntryAmount(amount);
    } catch {
      setInputError(t("entryAmountInvalid"));
      return;
    }
    setInputError(undefined);
    try {
      await entries.create(parsedAmount);
      setAmount("");
    } catch {
      setInputError(t("entrySaveFailed"));
    }
  };

  const header = (
    <View style={{ gap: spacing.lg }}>
      <AppCard>
        <AppText>{t("todayHeading")}</AppText>
        <AppText
          accessibilityLabel={`${formatAppNumber(
            BigInt(entries.summary.todayTotal),
            localeTag,
          )} Salawat`}
          variant="displayNumber"
        >
          {formatAppNumber(BigInt(entries.summary.todayTotal), localeTag)}
        </AppText>
        <FormField
          keyboardType="number-pad"
          label={t("todayAddLabel")}
          hint={t("todayAddHint")}
          error={inputError}
          value={amount}
          onChangeText={setAmount}
        />
        <AppButton
          disabled={!amount.trim()}
          label={t("todaySubmit")}
          loading={entries.busy}
          onPress={() => void submit()}
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
        <Metric
          label={t("todayTotal")}
          value={formatAppNumber(BigInt(entries.summary.allTimeTotal), localeTag)}
        />
        <Metric
          label={t("todayWeek")}
          value={formatAppNumber(BigInt(entries.summary.weekTotal), localeTag)}
        />
        <Metric
          label={t("todayGoal")}
          value={
            entries.summary.todayGoal
              ? formatAppNumber(BigInt(entries.summary.todayGoal), localeTag)
              : t("todayNoGoal")
          }
        />
        <Metric
          label={t("todayGoalDays")}
          value={
            goalProgress
              ? `${goalProgress.achievedDays}/${goalProgress.eligibleDays}`
              : t("todayNoGoalDay")
          }
        />
      </View>
      <GoalSection
        busy={entries.busy}
        goal={entries.summary.todayGoal}
        onClear={entries.clearGoal}
        onSave={entries.setGoal}
      />
      <AppText variant="title">{t("todayHistory")}</AppText>
    </View>
  );

  if (entries.viewState === "loading" || entries.viewState === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
        {header}
        <StateFeedback state={entries.viewState} />
      </View>
    );
  }

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
      }}
      data={entries.entries}
      keyExtractor={(entry) => entry.id}
      ListEmptyComponent={
        <AppCard>
          <AppText>{t("todayHistoryEmpty")}</AppText>
        </AppCard>
      }
      ListFooterComponent={
        entries.hasMore ? (
          <View style={{ gap: spacing.sm }}>
            {entries.paginationError ? (
              <AppText accessibilityLiveRegion="polite">
                {t("historyLoadFailed")}
              </AppText>
            ) : null}
            <AppButton
              label={t("historyLoadMore")}
              loading={entries.loadingMore}
              variant="secondary"
              onPress={() => void entries.loadMore()}
            />
          </View>
        ) : entries.entries.length ? (
          <AppText variant="caption">{t("historyEnd")}</AppText>
        ) : null
      }
      ListHeaderComponent={header}
      onEndReached={() => void entries.loadMore()}
      onEndReachedThreshold={0.4}
      renderItem={({ item }) => (
        <EntryRow
          entry={item}
          showTime={
            entries.entries.filter((entry) => entry.entryDate === item.entryDate)
              .length > 1
          }
          onDelete={(id) => void entries.delete(id)}
          onEdit={(id) => router.push({ pathname: "/entry/[id]/edit", params: { id } })}
        />
      )}
      style={{ backgroundColor: colors.background }}
    />
  );
}
