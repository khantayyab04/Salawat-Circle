import { SectionLabel } from "@/components/section-label";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The app header from the design: a serif wordmark with a gold uppercase line
 * underneath that names the current context, optionally preceded by a back
 * button and followed by a trailing action.
 */
export function AppHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  trailing,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.xxl,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      {onBack ? (
        <Pressable
          accessibilityLabel={backLabel}
          accessibilityRole="button"
          onPress={onBack}
          style={{
            minHeight: 44,
            minWidth: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <ArrowLeft color={colors.textPrimary} size={18} />
        </Pressable>
      ) : null}

      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text
          // The wordmark may shrink on very narrow phones but must stay whole.
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={[typography.screenTitle, { color: colors.textPrimary }]}
        >
          {title}
        </Text>
        <SectionLabel numberOfLines={1} tone="gold">
          {subtitle}
        </SectionLabel>
      </View>

      {trailing}
    </View>
  );
}
