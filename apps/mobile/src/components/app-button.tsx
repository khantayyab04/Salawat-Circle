import { radius, spacing, typography, useAppTheme } from "@/theme";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
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
      ? { background: colors.accent, foreground: colors.textInverse }
      : variant === "destructive"
        ? { background: colors.error, foreground: colors.textInverse }
        : variant === "secondary"
          ? { background: colors.accentMuted, foreground: colors.accent }
          : { background: "transparent", foreground: colors.accent };
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
          minHeight: 48,
          minWidth: 48,
          borderRadius: radius.md,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          backgroundColor: palette.background,
          opacity: inactive ? 0.55 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <Text style={[typography.bodyStrong, { color: palette.foreground }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
