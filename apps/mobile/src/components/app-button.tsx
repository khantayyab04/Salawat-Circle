import { radius, shadows, spacing, typography, useAppTheme } from "@/theme";
import { useAppReducedMotion } from "@/lib/use-app-reduced-motion";
import { useState, type ReactNode } from "react";
import Animated from "react-native-reanimated";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The primary action style from the design: a tall, very round button with a
 * bold label, a soft coloured shadow on the primary variant and a hairline
 * outline on the secondary one.
 *
 * Labels can wrap at their normal size so translated actions stay readable.
 */
export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
  accessibilityHint,
  icon,
  static: isStatic = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  icon?: ReactNode;
  static?: boolean;
}) {
  const { colors } = useAppTheme();
  const reducedMotion = useAppReducedMotion();
  const [pressed, setPressed] = useState(false);
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
    <AnimatedPressable
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, ...(loading ? { busy: true } : {}) }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      style={[
        {
          minHeight: 56,
          minWidth: 48,
          flexShrink: 1,
          flexDirection: "row",
          gap: spacing.sm,
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
          transform: [{ scale: pressed && !inactive && !isStatic && !reducedMotion ? 0.96 : 1 }],
          transitionProperty: ["transform", "opacity"],
          transitionDuration: reducedMotion ? 0 : 120,
          transitionTimingFunction: "ease-out",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <>
        {icon ? <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View> : null}
        <Text
          style={[typography.button, { color: palette.foreground, flexShrink: 1, textAlign: "center" }]}
        >
          {label}
        </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
