import { formatAppNumber, useTranslation } from "@/localization";
import { addTallyAmount, createTally, resetTally } from "@/lib/entries/tally";
import { parseEntryAmount, useEntries } from "@/lib/entries";
import {
  Banner,
  Button,
  Chip,
  ProgressRing,
  QuoteCard,
  NumberField,
  Screen,
  Text,
} from "@/ui";
import { useAppTheme } from "@/theme";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { View } from "react-native";
import { space } from "@/design-system";
import { BottomSheet, Column, Host } from "@expo/ui";

const quickAmounts = [100, 200, 500, 1000] as const;

export function TodayScreen() {
  const { t, localeTag } = useTranslation();
  const entries = useEntries();
  const { isJumuah } = useAppTheme();
  const router = useRouter();
  const [tally, setTally] = useState(createTally);
  const [saveError, setSaveError] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [customSheetOpen, setCustomSheetOpen] = useState(false);
  const [customError, setCustomError] = useState<string>();

  const todayTotal = formatAppNumber(BigInt(entries.summary.todayTotal), localeTag);
  const stagedTotal = formatAppNumber(
    BigInt(entries.summary.todayTotal) + BigInt(tally.amount),
    localeTag,
  );
  const commitLabel = t("todayCommit", {
    amount: formatAppNumber(BigInt(tally.amount), localeTag),
  });

  const submit = async () => {
    if (!tally.amount) return;
    setSaveError(false);
    try {
      await entries.create(tally.amount);
      setTally(resetTally);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    } catch {
      setSaveError(true);
    }
  };
  const applyCustomAmount = () => {
    try {
      const amount = parseEntryAmount(customAmount);
      setTally((current) => addTallyAmount(current, amount));
      setCustomAmount("");
      setCustomError(undefined);
      setCustomSheetOpen(false);
    } catch {
      setCustomError(t("entryAmountInvalid"));
    }
  };

  const syncFeedback =
    entries.syncState === "offline"
      ? { title: t("syncOfflineTitle"), body: t("syncOfflineBody"), tone: "info" as const }
      : entries.syncState === "pending"
        ? { title: t("syncPendingTitle"), body: t("syncPendingBody"), tone: "info" as const }
        : entries.syncState === "error"
          ? { title: t("syncFailedTitle"), body: t("syncFailedBody"), tone: "error" as const }
          : null;

  const weeklyContext = entries.summary.todayGoal
    ? t("todayWeeklyContext", {
        week: formatAppNumber(BigInt(entries.summary.weekTotal), localeTag),
        achieved: entries.summary.achievedDays,
        eligible: entries.summary.eligibleGoalDays,
      })
    : t("todayNoGoalContext");

  return (
    <>
      <Screen contentContainerStyle={{ justifyContent: "center" }}>
      {syncFeedback ? <Banner {...syncFeedback} /> : null}
      <View style={{ alignItems: "center", gap: space.lg }}>
        <Text accessibilityRole="header" variant="largeTitle">
          {t("todayTitle")}
        </Text>
        {isJumuah ? (
          <Text variant="label">{t("jumuahLabel")}</Text>
        ) : null}
        <ProgressRing
          current={Number(entries.summary.todayTotal)}
          display={stagedTotal}
          goal={entries.summary.todayGoal}
          label={`${todayTotal} Salawat`}
          staged={tally.amount}
        />
      </View>
      <View
        accessibilityLabel={t("todayStageAmount", {
          amount: formatAppNumber(BigInt(tally.amount), localeTag),
        })}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
      >
        {quickAmounts.map((amount) => (
          <Chip
            key={amount}
            label={t("todayStageAmount", { amount })}
            onPress={() => {
              setSaveError(false);
              setTally((current) => addTallyAmount(current, amount));
            }}
          />
        ))}
      </View>
      <Button
        label={t("todayCustomAmount")}
        onPress={() => setCustomSheetOpen(true)}
        variant="secondary"
      />
      {tally.amount ? (
        <Button
          label={t("todayResetTally")}
          variant="tertiary"
          onPress={() => setTally(resetTally)}
        />
      ) : null}
      {saveError ? (
        <Banner title={t("syncFailedTitle")} body={t("todaySaveFailed")} tone="error" />
      ) : null}
      <Button
        disabled={!tally.amount || tally.limitReached}
        label={commitLabel}
        loading={entries.busy}
        onPress={() => void submit()}
      />
      {entries.syncState === "error" ? (
        <Button
          label={t("syncRetry")}
          variant="secondary"
          onPress={() => void entries.retrySync()}
        />
      ) : null}
      <Button
        accessibilityHint={weeklyContext}
        label={t("todayOpenProgress")}
        variant="tertiary"
        onPress={() => router.push("/progress")}
      />
      {isJumuah ? (
        <QuoteCard
          label={t("jumuahQuoteLabel")}
          quote={t("jumuahQuote")}
          source={t("jumuahQuoteSource")}
        />
      ) : null}
      </Screen>
      <Host matchContents>
        <BottomSheet
          isPresented={customSheetOpen}
          onDismiss={() => setCustomSheetOpen(false)}
          snapPoints={["half"]}
        >
          <Column spacing={16}>
            <Text variant="title">{t("todayCustomAmount")}</Text>
            <NumberField
              error={customError}
              label={t("todayCustomAmount")}
              onChangeText={(value) => {
                setCustomError(undefined);
                setCustomAmount(value);
              }}
              value={customAmount}
            />
            <Button label={t("todayApplyCustom")} onPress={applyCustomAmount} />
          </Column>
        </BottomSheet>
      </Host>
    </>
  );
}
