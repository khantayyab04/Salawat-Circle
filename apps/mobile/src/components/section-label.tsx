import { typography, useAppTheme } from "@/theme";
import { Text, type TextProps, type TextStyle } from "react-native";

/**
 * The wide uppercase caption that carries the whole design: it labels the
 * staged amount, every stat tile, every form field and the header subtitle.
 *
 * Labels deliberately have no line limit. On narrow phones a caption such as
 * "Group needs per day" must wrap onto a second line rather than be cut.
 */
export function SectionLabel({
  children,
  tone = "muted",
  size = "regular",
  style,
  ...props
}: TextProps & {
  tone?: "muted" | "gold" | "primary" | "onPrimary";
  size?: "regular" | "small";
}) {
  const { colors } = useAppTheme();
  const color =
    tone === "gold"
      ? colors.goldText
      : tone === "primary"
        ? colors.primary
        : tone === "onPrimary"
          ? colors.textOnPrimary
          : colors.textSecondary;

  return (
    <Text
      style={[
        (size === "small"
          ? typography.labelSmall
          : typography.label) as TextStyle,
        { color },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
