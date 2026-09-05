import { radius, spacing, typography, useAppTheme } from "@/theme";
import { Text, View } from "react-native";
import { SectionLabel } from "./section-label";

/**
 * A short status message above the content, styled like the cards around it
 * rather than as a system banner.
 */
export function StatusBanner({
  title,
  body,
  tone = "offline",
}: {
  title: string;
  body: string;
  tone?: "offline" | "pending" | "error";
}) {
  const { colors } = useAppTheme();
  const accent =
    tone === "error"
      ? colors.error
      : tone === "pending"
        ? colors.gold
        : colors.textSecondary;

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderColor: accent,
        borderWidth: 1,
        borderRadius: radius.card,
        borderCurve: "continuous",
        padding: spacing.xl,
      }}
    >
      <Text style={[typography.bodyStrong, { color: accent }]}>{title}</Text>
      <SectionLabel size="small">{body}</SectionLabel>
    </View>
  );
}
