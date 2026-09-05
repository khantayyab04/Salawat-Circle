import { AppButton } from "@/components/app-button";
import { SectionLabel } from "@/components/section-label";
import { Surface } from "@/components/surface";
import { spacing, typography, useAppTheme } from "@/theme";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

/**
 * The card used for every non-content state: loading, empty, offline, rate
 * limited, not found and errors.
 *
 * Keeping them in one component means every such state looks the same and
 * always offers its way out in the same place.
 */
export function StateCard({
  title,
  body,
  icon,
  actionLabel,
  onAction,
  busy = false,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <Surface
      accessibilityRole="alert"
      accessible
      style={{ gap: spacing.lg, alignItems: "flex-start" }}
    >
      {icon ? <View>{icon}</View> : null}
      <View style={{ gap: spacing.sm, width: "100%" }}>
        <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <SectionLabel>{body}</SectionLabel>
      </View>
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          loading={busy}
          onPress={onAction}
          style={{ alignSelf: "stretch" }}
          variant="secondary"
        />
      ) : null}
    </Surface>
  );
}
