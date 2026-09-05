import { radius, shadows, spacing, typography, useAppTheme } from "@/theme";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

/**
 * The primary action style from the design: a tall, very round button with a
 * bold label, a soft coloured shadow on the primary variant and a hairline
 * outline on the secondary one.
 *
 * Labels shrink slightly rather than truncate, so a long translation still
 * fits on a narrow phone.
 */
export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { colors } = useAppTheme();
  const palette =
    variant === "primary"
      ? {
          background: colors.primary,
          foreground: colors.textOnPrimary,
          border: "transparent",
          shadow: shadows.raised,
        }
      : variant === "destructive"
        ? {
            background: colors.surface,
            foreground: colors.error,
            border: colors.error,
            shadow: undefined,
          }
        : variant === "secondary"
          ? {
              background: colors.surface,
              foreground: colors.textPrimary,
              border: colors.border,
              shadow: shadows.card,
            }
          : {
              background: "transparent",
              foreground: colors.primary,
              border: "transparent",
              shadow: undefined,
            };
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 56,
          minWidth: 48,
          borderRadius: radius.xl,
          borderCurve: "continuous",
          borderColor: palette.border,
          borderWidth: palette.border === "transparent" ? 0 : 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
          backgroundColor: palette.background,
          boxShadow: inactive ? undefined : palette.shadow,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <Text
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
          style={[typography.button, { color: palette.foreground }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
