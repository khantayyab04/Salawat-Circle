import { AppButton } from "@/components/app-button";
import { AppSheet } from "@/components/app-sheet";
import { AppToggle } from "@/components/app-toggle";
import { SectionLabel } from "@/components/section-label";
import { Surface } from "@/components/surface";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

export type GoalSheetCopy = {
  title: string;
  subtitle: string;
  enableLabel: string;
  enableHint: string;
  unit: string;
  save: string;
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
 * common range up to ten thousand, so the number field stays authoritative and
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
      key={`${props.visible}:${props.currentGoal ?? "none"}`}
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

  return (
    <AppSheet
      closeLabel={copy.close}
      onClose={onClose}
      subtitle={copy.subtitle}
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
          <SectionLabel size="small">{copy.enableHint}</SectionLabel>
        </View>
        <AppToggle
          accessibilityLabel={copy.enableLabel}
          onChange={setEnabled}
          value={enabled}
        />
      </Surface>

      {enabled ? (
        <View style={{ gap: spacing.md, alignItems: "center" }}>
          <TextInput
            accessibilityLabel={copy.title}
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={8}
            onChangeText={(next) => setValue(next.replace(/[^\d]/g, ""))}
            style={[
              typography.display,
              {
                color: colors.textPrimary,
                textAlign: "center",
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
          {valid ? null : (
            <SectionLabel tone="gold">{copy.invalid}</SectionLabel>
          )}
        </View>
      ) : null}

      {failed ? <SectionLabel tone="gold">{copy.failed}</SectionLabel> : null}

      <AppButton
        disabled={enabled && !valid}
        label={copy.save}
        loading={busy}
        onPress={() => onSave(enabled ? parsed : null)}
      />
    </AppSheet>
  );
}
