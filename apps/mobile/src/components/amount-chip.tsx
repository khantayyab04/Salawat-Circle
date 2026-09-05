import { radius, spacing, typography, useAppTheme } from "@/theme";
import { useState } from "react";
import { Pressable, Text } from "react-native";

/**
 * One of the quick amount chips on the Today screen.
 *
 * The chips share their row through `flex`, so on a narrow phone they get
 * narrower rather than pushing each other off screen.
 *
 * The pressed state is tracked explicitly rather than through `Pressable`'s
 * render-prop children, because the chip recolours its background and its
 * label together, and render-prop children keep press events from reaching
 * state updates in tests.
 */
export function AmountChip({
  amount,
  onPress,
  disabled = false,
  format = (value: number) => `+${value}`,
}: {
  amount: number;
  onPress: (amount: number) => void;
  disabled?: boolean;
  format?: (amount: number) => string;
}) {
  const { colors } = useAppTheme();
  const [pressed, setPressed] = useState(false);
  const label = format(amount);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(amount)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        flex: 1,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        borderCurve: "continuous",
        backgroundColor: pressed ? colors.primary : colors.surfaceMuted,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
        style={[
          typography.bodyStrong,
          {
            color: pressed ? colors.textOnPrimary : colors.textPrimary,
            fontVariant: ["tabular-nums"],
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
