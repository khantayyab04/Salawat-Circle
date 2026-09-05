import {
  AmountChip,
  AmountText,
  AppButton,
  AppScreen,
  AppSheet,
  GoalSheet,
  OfflineLoadErrorCard,
  OfflineRecoveryCard,
  ProgressRing,
  SectionLabel,
  Surface,
  SyncNotice,
  type SyncTone,
} from "@/components";
import { AppHeader } from "@/components/app-header";
import { useEntries } from "@/lib/entries";
import { addTallyAmount, createTally, resetTally } from "@/lib/entries/tally";
import { formatAppNumber, useTranslation } from "@/localization";
import {
  fitNumericFontSize,
  pickBySize,
  radius,
  shadows,
  sizeClassFor,
  spacing,
  typography,
  useAppTheme,
} from "@/theme";
import Heart from "lucide-react-native/icons/heart";
import Pencil from "lucide-react-native/icons/pencil";
import Plus from "lucide-react-native/icons/plus";
import X from "lucide-react-native/icons/x";
import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

const quickAmounts = [100, 200, 500, 1000] as const;

export function TodayScreen() {
  const { t, localeTag } = useTranslation();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const entries = useEntries();

  const [tally, setTally] = useState(createTally());
  const [saveFailed, setSaveFailed] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalFailed, setGoalFailed] = useState(false);
  const [customAmountOpen, setCustomAmountOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  if (entries.offlineLoadErrorCode === "INVALID_OFFLINE_STATE") {
    return (
      <AppScreen floatingTabBar>
        <OfflineRecoveryCard
          busy={entries.busy}
          onReset={entries.resetOfflineState}
        />
      </AppScreen>
    );
  }

  if (entries.offlineLoadErrorCode === "INTERNAL") {
    return (
      <AppScreen floatingTabBar>
        <OfflineLoadErrorCard
          busy={entries.busy}
          onRetry={entries.retryOfflineLoad}
        />
      </AppScreen>
    );
  }

  const sizeClass = sizeClassFor(width);
  const number = (value: string) => formatAppNumber(BigInt(value), localeTag);

  const goal = entries.summary.todayGoal;
  const todayTotal = entries.summary.todayTotal;
  const progress = goal ? Number(todayTotal) / Number(goal) : null;

  // The ring is sized from the available width so it keeps its proportions on
  // a 320 point phone as well as on a 440 point one.
  const cardPadding = pickBySize(sizeClass, { compact: 20, regular: 24 });
  const available = Math.max(
    160,
    Math.min(width, 720) - spacing.lg * 2 - cardPadding * 2,
  );
  const ringSize = Math.min(
    available * 0.82,
    pickBySize(sizeClass, { compact: 190, regular: 208, wide: 220 }),
  );

  const totalText = number(todayTotal);
  const totalFontSize = fitNumericFontSize(totalText, {
    // Keep the value clear of the ring stroke on both sides.
    maxWidth: ringSize * 0.68,
    fontSize: pickBySize(sizeClass, { compact: 40, regular: 46, wide: 48 }),
    minFontSize: 22,
  });

  const stagedText = number(String(tally.amount));
  const parsedCustomAmount = Number(customAmount);
  const isCustomAmountValid =
    /^\d+$/.test(customAmount) &&
    parsedCustomAmount >= 1 &&
    parsedCustomAmount <= 10_000_000;

  const sync = describeSyncState(entries.syncState, t);

  const saveGoal = async (amount: number | null) => {
    setGoalFailed(false);
    try {
      await (amount === null ? entries.clearGoal() : entries.setGoal(amount));
      setGoalOpen(false);
    } catch {
      // The sheet stays open with the entered value so nothing is lost.
      setGoalFailed(true);
    }
  };

  const commit = async () => {
    if (tally.amount <= 0) return;
    setSaveFailed(false);
    try {
      // One commit is exactly one call: the store owns id generation, the
      // offline queue, retries and idempotency.
      await entries.create(tally.amount);
      setTally(resetTally(tally));
    } catch {
      // The staged amount deliberately survives a failure so the user does not
      // have to tap it together again.
      setSaveFailed(true);
    }
  };

  const addCustomAmount = () => {
    if (!isCustomAmountValid) return;
    setTally((current) => addTallyAmount(current, parsedCustomAmount));
    setCustomAmount("");
    setCustomAmountOpen(false);
  };

  return (
    <AppScreen
      floatingTabBar
      header={
        <AppHeader subtitle={t("headerTodayEyebrow")} title={t("appName")} />
      }
    >
      <Surface style={{ alignItems: "center", padding: cardPadding }}>
        <SectionLabel style={{ marginBottom: spacing.xl }}>
          {new Date().toLocaleDateString(localeTag, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </SectionLabel>

        <ProgressRing
          accessibilityLabel={
            goal
              ? t("todayWeeklyContext", {
                  week: number(entries.summary.weekTotal),
                  achieved: entries.summary.achievedDays,
                  eligible: entries.summary.eligibleGoalDays,
                })
              : t("todayNoGoalContext")
          }
          progress={progress}
          size={ringSize}
        >
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <AmountText
              style={{ fontSize: totalFontSize, lineHeight: totalFontSize * 1.1 }}
              testID="today-total"
              value={totalText}
              variant="display"
            />
            {goal ? (
              <Pressable
                accessibilityLabel={t("progressEditGoal")}
                accessibilityRole="button"
                onPress={() => setGoalOpen(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.xs,
                  minHeight: 44,
                  paddingHorizontal: spacing.sm,
                }}
              >
                <SectionLabel>{`/ ${number(goal)}`}</SectionLabel>
                <Pencil color={colors.textSecondary} size={11} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel={t("todayNoGoal")}
                accessibilityRole="button"
                onPress={() => setGoalOpen(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.xs,
                  minHeight: 44,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: colors.primarySoft,
                }}
              >
                <Plus color={colors.primary} size={12} />
                <SectionLabel tone="primary">{t("todayNoGoal")}</SectionLabel>
              </Pressable>
            )}
          </View>
        </ProgressRing>

        <View
          style={{
            width: "100%",
            marginTop: spacing.xxl,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {quickAmounts.map((amount) => (
              <AmountChip
                amount={amount}
                key={amount}
                onPress={(value) =>
                  setTally((current) => addTallyAmount(current, value))
                }
              />
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View
              style={{
                flex: 2,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing.sm,
                padding: spacing.lg,
                borderRadius: radius.xl,
                borderCurve: "continuous",
                borderColor: colors.border,
                borderWidth: 1,
                backgroundColor: colors.surfaceSubtle,
              }}
            >
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <SectionLabel size="small" tone="gold">
                  {t("todayStagedLabel")}
                </SectionLabel>
                <Text
                  adjustsFontSizeToFit
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                  style={[typography.statNumber, { color: colors.textPrimary }]}
                  testID="staged-amount"
                >
                  {stagedText}
                </Text>
              </View>
              {tally.amount > 0 ? (
                <Pressable
                  accessibilityLabel={t("todayResetTally")}
                  accessibilityRole="button"
                  onPress={() => setTally((current) => resetTally(current))}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radius.pill,
                    backgroundColor: colors.surface,
                  }}
                >
                  <X color={colors.textPrimary} size={14} />
                </Pressable>
              ) : (
                <Pressable
                  accessibilityLabel={t("todayCustomAmount")}
                  accessibilityRole="button"
                  onPress={() => setCustomAmountOpen(true)}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radius.pill,
                    borderColor: colors.border,
                    borderStyle: "dashed",
                    borderWidth: 1,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Plus color={colors.textSecondary} size={14} />
                </Pressable>
              )}
            </View>

            <Pressable
              accessibilityLabel={
                tally.amount > 0
                  ? t("todayCommit", { amount: stagedText })
                  : t("todaySubmit")
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: tally.amount <= 0 }}
              disabled={tally.amount <= 0}
              onPress={commit}
              style={({ pressed }) => ({
                flex: 3,
                minHeight: 56,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: spacing.md,
                borderRadius: radius.xl,
                borderCurve: "continuous",
                backgroundColor:
                  tally.amount > 0 ? colors.primary : colors.surfaceMuted,
                opacity: tally.amount > 0 ? (pressed ? 0.85 : 1) : 0.55,
                boxShadow: tally.amount > 0 ? shadows.raised : undefined,
              })}
            >
              <Text
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                style={[
                  typography.button,
                  {
                    color:
                      tally.amount > 0
                        ? colors.textOnPrimary
                        : colors.textSecondary,
                  },
                ]}
              >
                {tally.amount > 0
                  ? t("todayCommit", { amount: stagedText })
                  : t("todaySubmit")}
              </Text>
            </Pressable>
          </View>

          {tally.limitReached ? (
            <SectionLabel tone="gold">{t("entryAmountInvalid")}</SectionLabel>
          ) : null}

          {saveFailed ? (
            <SectionLabel tone="gold">{t("todaySaveFailed")}</SectionLabel>
          ) : null}
        </View>
      </Surface>

      {sync ? (
        <SyncNotice
          actionLabel={sync.retryable ? t("syncRetry") : undefined}
          body={sync.body}
          onAction={sync.retryable ? entries.retrySync : undefined}
          title={sync.title}
          tone={sync.tone}
        />
      ) : null}

      <JumuahCard />

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
        currentGoal={goal}
        failed={goalFailed}
        onClose={() => setGoalOpen(false)}
        onSave={(amount) => void saveGoal(amount)}
        visible={goalOpen}
      />

      <AppSheet
        closeLabel={t("commonCancel")}
        onClose={() => setCustomAmountOpen(false)}
        subtitle={t("todayAddHint")}
        title={t("todayCustomAmount")}
        visible={customAmountOpen}
      >
        <TextInput
          accessibilityLabel={t("todayCustomAmount")}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={8}
          onChangeText={(value) => setCustomAmount(value.replace(/[^\d]/g, ""))}
          placeholder="0"
          placeholderTextColor={colors.textDisabled}
          style={[
            typography.display,
            {
              color: colors.textPrimary,
              textAlign: "center",
              padding: spacing.lg,
              borderRadius: radius.xl,
              borderCurve: "continuous",
              backgroundColor: colors.surfaceMuted,
            },
          ]}
          testID="custom-amount-input"
          value={customAmount}
        />
        <AppButton
          disabled={!isCustomAmountValid}
          label={t("todayApplyCustom")}
          onPress={addCustomAmount}
        />
      </AppSheet>
    </AppScreen>
  );
}

function JumuahCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <Surface
      style={{
        backgroundColor: colors.primary,
        borderWidth: 0,
        flexDirection: "row",
        gap: spacing.lg,
        boxShadow: shadows.raised,
      }}
      tone="plain"
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(197, 160, 89, 0.3)",
        }}
      >
        <Heart color={colors.gold} fill={colors.gold} size={18} />
      </View>
      <View style={{ flex: 1, gap: spacing.md }}>
        <Text style={[typography.cardTitle, { color: colors.gold }]}>
          {t("jumuahLabel")}
        </Text>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.textOnPrimary, fontStyle: "italic" },
          ]}
        >
          {t("jumuahQuote")}
        </Text>
        <SectionLabel size="small" tone="onPrimary">
          {t("jumuahQuoteSource")}
        </SectionLabel>
      </View>
    </Surface>
  );
}


type Translate = ReturnType<typeof useTranslation>["t"];

/**
 * Turns the store's synchronisation state into something the user can act on.
 * Only the states that need attention offer a retry.
 */
function describeSyncState(
  state: string | undefined,
  t: Translate,
): { title: string; body: string; tone: SyncTone; retryable: boolean } | null {
  switch (state) {
    case "offline":
      return {
        title: t("syncOfflineTitle"),
        body: t("syncOfflineBody"),
        tone: "offline",
        retryable: false,
      };
    case "pending":
      return {
        title: t("syncPendingTitle"),
        body: t("syncPendingBody"),
        tone: "pending",
        retryable: false,
      };
    case "error":
      return {
        title: t("syncFailedTitle"),
        body: t("syncFailedBody"),
        tone: "error",
        retryable: true,
      };
    case "conflict":
      return {
        title: t("syncConflictTitle"),
        body: t("syncConflictBody"),
        tone: "conflict",
        retryable: true,
      };
    default:
      return null;
  }
}
