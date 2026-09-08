import { AppButton } from "@/components/app-button";
import { AppSheet } from "@/components/app-sheet";
import { AppToggle } from "@/components/app-toggle";
import { SectionLabel } from "@/components/section-label";
import { Surface } from "@/components/surface";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import { useState } from "react";
import { Host, Slider } from "@expo/ui";
import {
  accessibilityHint as swiftAccessibilityHint,
  accessibilityLabel as swiftAccessibilityLabel,
  accessibilityValue as swiftAccessibilityValue,
} from "@expo/ui/swift-ui/modifiers";
import {
  Platform,
  Text,
  TextInput,
  View,
  type AccessibilityActionEvent,
} from "react-native";

export type GoalSheetCopy = {
  title: string;
  subtitle: string;
  enableLabel: string;
  enableHint: string;
  unit: string;
  sliderLabel: string;
  sliderHint: string;
  amountLabel: string;
  amountHint: string;
  save: string;
  clear: string;
  close: string;
  invalid: string;
  failed: string;
};

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10_000_000;

/**
 * The daily goal editor from the design.
 *
 * The design pairs a slider with a large number. The slider only covers the
 * common range up to thirty thousand, so the number field stays authoritative and
 * accepts any permitted value; that way a user with a much larger goal is not
 * forced into the slider's range.
 */
export function GoalSheet(props: {
  visible: boolean;
  onClose: () => void;
  onSave: (amount: number | null) => void;
  currentGoal: string | null;
  copy: GoalSheetCopy;
  busy?: boolean;
  failed?: boolean;
}) {
  // Remounting on open re-seeds the form from the saved goal without an effect
  // that writes state during render.
  return (
    <GoalSheetForm
      key={String(props.visible)}
      {...props}
    />
  );
}

function GoalSheetForm({
  visible,
  onClose,
  onSave,
  currentGoal,
  copy,
  busy = false,
  failed = false,
}: {
  visible: boolean;
  onClose: () => void;
  /** Receives the new goal, or null when the goal is switched off. */
  onSave: (amount: number | null) => void;
  currentGoal: string | null;
  copy: GoalSheetCopy;
  busy?: boolean;
  failed?: boolean;
}) {
  const { colors } = useAppTheme();

  const [enabled, setEnabled] = useState(currentGoal !== null);
  const [value, setValue] = useState(currentGoal ?? "1000");

  const parsed = Number(value);
  const valid =
    /^\d+$/.test(value) && parsed >= MIN_AMOUNT && parsed <= MAX_AMOUNT;
  const sliderValue = Math.max(100, Math.min(30_000, Math.round((valid ? parsed : 100) / 100) * 100));
  const updateSliderValue = (amount: number) =>
    setValue(String(Math.round(Math.max(100, Math.min(30_000, amount)) / 100) * 100));
  const handleAndroidAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (busy) return;
    if (event.nativeEvent.actionName === "increment") {
      updateSliderValue(sliderValue + 100);
    } else if (event.nativeEvent.actionName === "decrement") {
      updateSliderValue(sliderValue - 100);
    }
  };

  const slider = (
    <Host
      accessibilityElementsHidden={Platform.OS === "android"}
      importantForAccessibility={
        Platform.OS === "android" ? "no-hide-descendants" : "auto"
      }
      matchContents={{ vertical: true }}
      seedColor={colors.primary}
      style={{ width: "100%", minHeight: 44 }}
    >
      <Slider
        min={100}
        max={30_000}
        step={100}
        value={sliderValue}
        disabled={busy}
        modifiers={
          Platform.OS === "ios"
            ? [
                swiftAccessibilityLabel(copy.sliderLabel),
                swiftAccessibilityHint(copy.sliderHint),
                swiftAccessibilityValue(String(sliderValue)),
              ]
            : undefined
        }
        onValueChange={updateSliderValue}
        testID="goal-quick-slider"
      />
    </Host>
  );

  return (
    <AppSheet
      dismissible={!busy}
      closeLabel={copy.close}
      onClose={onClose}
      title={copy.title}
      visible={visible}
    >
      <Surface
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.lg,
        }}
        tone="muted"
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
            {copy.enableLabel}
          </Text>
        </View>
        <AppToggle
          disabled={busy}
          accessibilityLabel={copy.enableLabel}
          onChange={setEnabled}
          value={enabled}
        />
      </Surface>

      {enabled ? (
        <View style={{ gap: spacing.md, alignItems: "center" }}>
          <TextInput
            editable={!busy}
            accessibilityHint={copy.amountHint}
            accessibilityLabel={copy.amountLabel}
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={8}
            onChangeText={setValue}
            style={[
              typography.display,
              {
                color: colors.textPrimary,
                textAlign: "center",
                lineHeight: undefined,
                textAlignVertical: "center",
                includeFontPadding: false,
                minWidth: 160,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.xl,
                borderCurve: "continuous",
                backgroundColor: colors.surfaceMuted,
              },
            ]}
            testID="goal-amount-input"
            value={value}
          />
          <SectionLabel tone="gold">{copy.unit}</SectionLabel>
          {Platform.OS === "android" ? (
            <View
              accessible
              accessibilityActions={[
                { name: "increment" },
                { name: "decrement" },
              ]}
              accessibilityHint={copy.sliderHint}
              accessibilityLabel={copy.sliderLabel}
              accessibilityRole="adjustable"
              accessibilityState={{ disabled: busy }}
              accessibilityValue={{
                min: 100,
                max: 30_000,
                now: sliderValue,
                text: String(sliderValue),
              }}
              onAccessibilityAction={handleAndroidAccessibilityAction}
              style={{ width: "100%" }}
            >
              {slider}
            </View>
          ) : (
            slider
          )}
          {valid ? null : (
            <SectionLabel tone="gold">{copy.invalid}</SectionLabel>
          )}
        </View>
      ) : null}

      {failed ? <SectionLabel tone="gold">{copy.failed}</SectionLabel> : null}

      <AppButton
        disabled={enabled ? !valid : currentGoal === null}
        label={!enabled && currentGoal !== null ? copy.clear : copy.save}
        loading={busy}
        onPress={() => onSave(enabled ? parsed : null)}
      />
    </AppSheet>
  );
}
