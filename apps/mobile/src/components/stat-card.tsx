import { AmountText } from "@/components/amount-text";
import { SectionLabel } from "@/components/section-label";
import { Surface } from "@/components/surface";
import { spacing, useAppTheme } from "@/theme";
import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

/**
 * One tile of the stat grids on Progress and Group detail: an optional icon,
 * a large serif value and a wide uppercase caption underneath.
 *
 * Tiles are laid out with `flex` by their parent grid, never with a fixed
 * width, so two of them always share the available row on any phone.
 */
export function StatCard({
  value,
  caption,
  icon,
  tone = "default",
  align = "start",
  testID,
  style,
  ...props
}: ViewProps & {
  value: string;
  caption: string;
  icon?: ReactNode;
  tone?: "default" | "gold";
  align?: "start" | "center";
  testID?: string;
}) {
  const centered = align === "center";
  const { colors } = useAppTheme();
  return (
    <Surface
      style={[
        {
          flex: 1,
          gap: spacing.sm,
          alignItems: centered ? "center" : "flex-start",
        },
        style,
      ]}
      testID={testID}
      {...props}
    >
      {icon ? <View style={{ marginBottom: spacing.xxs }}>{icon}</View> : null}
      <AmountText
        color={tone === "gold" ? colors.goldText : colors.textPrimary}
        testID={testID ? `${testID}-value` : undefined}
        value={value}
        variant="statNumber"
        style={centered ? { textAlign: "center" } : undefined}
      />
      <SectionLabel
        style={centered ? { textAlign: "center" } : undefined}
        tone={tone === "gold" ? "gold" : "muted"}
      >
        {caption}
      </SectionLabel>
    </Surface>
  );
}
