import { SectionLabel } from "@/components/section-label";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

/**
 * A row in the grouped settings lists: an icon, a label, an optional trailing
 * value and a chevron.
 *
 * The label and the value share the row through `flex`, so a long translated
 * label pushes the value rather than overlapping it, and both wrap instead of
 * being cut on a narrow phone.
 */
export function SettingsRow({
  label,
  value,
  icon,
  onPress,
  accessibilityHint,
  trailing,
}: {
  label: string;
  value?: string;
  icon?: ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
  /** Replaces the chevron, for example with a switch. */
  trailing?: ReactNode;
}) {
  const { colors } = useAppTheme();

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 56,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.xl,
        borderCurve: "continuous",
      }}
    >
      {icon ? (
        <View style={{ width: 20, alignItems: "center" }}>{icon}</View>
      ) : null}
      <Text
        style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}
      >
        {label}
      </Text>
      {value ? (
        <Text
          numberOfLines={1}
          style={[
            typography.captionMedium,
            { color: colors.textSecondary, flexShrink: 1 },
          ]}
        >
          {value}
        </Text>
      ) : null}
      {trailing ?? <ChevronRight color={colors.textSecondary} size={16} />}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

/** Groups settings rows into one card, matching the design's sections. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        borderCurve: "continuous",
        padding: spacing.sm,
      }}
    >
      {children}
    </View>
  );
}

/** A caption above a settings group. */
export function SettingsSectionLabel({ children }: { children: string }) {
  return (
    <SectionLabel style={{ paddingHorizontal: spacing.lg }}>
      {children}
    </SectionLabel>
  );
}
