import { radius, shadows, spacing, useAppTheme } from "@/theme";
import { View, type ViewProps } from "react-native";

/**
 * The white card the whole design is built from: very round corners, a hairline
 * border and a soft shadow on the warm page background.
 *
 * Cards never set a width. They either fill their column or share a row via
 * `flex`, which is what keeps the layout intact from a 320 point phone up to a
 * tablet.
 */
export function Surface({
  children,
  tone = "surface",
  padding = "regular",
  style,
  ...props
}: ViewProps & {
  tone?: "surface" | "muted" | "primary" | "plain";
  padding?: "regular" | "tight" | "roomy" | "none";
}) {
  const { colors } = useAppTheme();

  const background =
    tone === "muted"
      ? colors.surfaceMuted
      : tone === "primary"
        ? colors.primary
        : tone === "plain"
          ? "transparent"
          : colors.surface;

  const paddingValue =
    padding === "none"
      ? 0
      : padding === "tight"
        ? spacing.lg
        : padding === "roomy"
          ? spacing.xxl
          : spacing.xl;

  return (
    <View
      style={[
        {
          backgroundColor: background,
          borderRadius: radius.card,
          borderCurve: "continuous",
          padding: paddingValue,
        },
        tone === "surface" && {
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: shadows.card,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
