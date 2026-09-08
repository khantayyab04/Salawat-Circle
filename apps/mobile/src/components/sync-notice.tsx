import { SectionLabel } from "@/components/section-label";
import { Surface } from "@/components/surface";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import { Pressable, Text, View } from "react-native";

export type SyncTone = "offline" | "pending" | "error" | "conflict";

/**
 * The synchronisation notice shown above the fold when local changes are not
 * yet on the server, or when they need attention.
 *
 * It is styled as a card like everything else in the design rather than as a
 * system banner, and it always offers the way out when there is one.
 */
export function SyncNotice({
  title,
  body,
  tone,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  tone: SyncTone;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useAppTheme();
  const accent =
    tone === "error" || tone === "conflict"
      ? colors.error
      : tone === "pending"
        ? colors.gold
        : colors.textSecondary;

  return (
    <Surface
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessible
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        borderColor: accent,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={[typography.bodyStrong, { color: accent }]}>{title}</Text>
        <SectionLabel size="small">{body}</SectionLabel>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={{
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.lg,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <SectionLabel numberOfLines={1} tone="primary">
            {actionLabel}
          </SectionLabel>
        </Pressable>
      ) : null}
    </Surface>
  );
}
