import { radius, spacing, useAppTheme } from "@/theme";
import { View } from "react-native";
import { AppText } from "./app-text";
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
  const color =
    tone === "error"
      ? colors.error
      : tone === "pending"
        ? colors.pending
        : colors.offline;
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        gap: spacing.xs,
        borderColor: color,
        borderWidth: 1,
        borderRadius: radius.md,
        borderCurve: "continuous",
        padding: spacing.md,
      }}
    >
      <AppText variant="bodyStrong" style={{ color }}>
        {title}
      </AppText>
      <AppText variant="caption">{body}</AppText>
    </View>
  );
}
