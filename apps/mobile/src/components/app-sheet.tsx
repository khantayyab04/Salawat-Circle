import { SectionLabel } from "@/components/section-label";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import type { PropsWithChildren, ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The bottom sheet used for the goal editor, group creation, invitations and
 * every confirmation in the design.
 *
 * The body scrolls and the sheet is capped at a share of the screen height, so
 * a long form on a small phone stays reachable instead of running off screen.
 */
export function AppSheet({
  visible,
  onClose,
  title,
  subtitle,
  closeLabel,
  footer,
  children,
}: PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  closeLabel: string;
  footer?: ReactNode;
}>) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(11, 92, 75, 0.35)",
          }}
        />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            borderCurve: "continuous",
            maxHeight: height * 0.9,
            paddingBottom: insets.bottom + spacing.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: spacing.lg,
              paddingHorizontal: spacing.xxl,
              paddingTop: spacing.xxl,
              paddingBottom: spacing.lg,
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
            }}
          >
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text
                style={[typography.title, { color: colors.textPrimary }]}
              >
                {title}
              </Text>
              {subtitle ? <SectionLabel>{subtitle}</SectionLabel> : null}
            </View>
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              onPress={onClose}
              style={{
                minHeight: 44,
                minWidth: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceMuted,
              }}
            >
              <Text
                style={[typography.button, { color: colors.textPrimary }]}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: spacing.xxl,
              gap: spacing.xxl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {footer ? (
            <View
              style={{
                paddingHorizontal: spacing.xxl,
                paddingTop: spacing.lg,
                gap: spacing.md,
                borderTopColor: colors.border,
                borderTopWidth: 1,
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
