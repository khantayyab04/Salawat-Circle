import { parseGoalAmount } from "@/lib/entries";
import { useTranslation } from "@/localization";
import { spacing } from "@/theme";
import { Host, Slider } from "@expo/ui";
import { useState } from "react";
import { View } from "react-native";
import { AppButton } from "./app-button";
import { AppCard } from "./app-card";
import { AppText } from "./app-text";
import { FormField } from "./form-field";

const DEFAULT_GOAL = 100;
const SLIDER_MAX = 10_000;
const SLIDER_STEP = 100;

function sliderValue(amount: string) {
  try {
    return Math.min(parseGoalAmount(amount), SLIDER_MAX);
  } catch {
    return DEFAULT_GOAL;
  }
}

export function GoalSection({
  goal,
  busy,
  onSave,
  onClear,
}: {
  goal: string | null;
  busy: boolean;
  onSave(amount: number): Promise<void>;
  onClear(): Promise<void>;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(goal ?? String(DEFAULT_GOAL));
  const [error, setError] = useState<string | undefined>();

  const save = async () => {
    try {
      await onSave(parseGoalAmount(amount));
      setError(undefined);
    } catch {
      setError(t("goalSaveFailed"));
    }
  };

  const clear = async () => {
    try {
      await onClear();
      setAmount(String(DEFAULT_GOAL));
      setError(undefined);
    } catch {
      setError(t("goalSaveFailed"));
    }
  };

  return (
    <AppCard style={{ gap: spacing.md }}>
      <AppText variant="title">{t("goalTitle")}</AppText>
      <View
        accessible
        accessibilityHint={t("goalSliderHint")}
        accessibilityLabel={t("goalSliderLabel")}
        accessibilityRole="adjustable"
        accessibilityValue={{
          min: 1,
          max: SLIDER_MAX,
          now: sliderValue(amount),
          text: amount,
        }}
      >
        <Host matchContents>
          <Slider
            disabled={busy}
            max={SLIDER_MAX}
            min={1}
            onValueChange={(value) => setAmount(String(value))}
            step={SLIDER_STEP}
            testID="daily-goal-slider"
            value={sliderValue(amount)}
          />
        </Host>
      </View>
      <FormField
        keyboardType="number-pad"
        label={t("goalAmountLabel")}
        hint={t("goalAmountHint")}
        error={error}
        value={amount}
        onChangeText={setAmount}
      />
      <AppButton
        disabled={!amount.trim()}
        label={t("goalSave")}
        loading={busy}
        onPress={() => void save()}
      />
      <AppButton
        label={t("goalClear")}
        loading={busy}
        variant="secondary"
        onPress={() => void clear()}
      />
    </AppCard>
  );
}
