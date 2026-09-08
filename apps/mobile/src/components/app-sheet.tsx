import { SectionLabel } from "@/components/section-label";
import { useAppReducedMotion } from "@/lib/use-app-reduced-motion";
import { radius, spacing, typography, useAppTheme } from "@/theme";
import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  dismissible = true,
}: PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  closeLabel: string;
  footer?: ReactNode;
  dismissible?: boolean;
}>) {
  const { colors } = useAppTheme();
  const reducedMotion = useAppReducedMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const close = () => {
    if (dismissible) onClose();
  };

  return (
    <Modal
      animationType={reducedMotion ? "fade" : "slide"}
      onRequestClose={close}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          disabled={!dismissible}
          onPress={close}
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
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            borderCurve: "continuous",
            maxHeight: height * 0.9,
            flexShrink: 1,
            width: "100%",
            maxWidth: 720,
            alignSelf: "center",
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
                accessibilityRole="header"
                style={[typography.title, { color: colors.textPrimary }]}
              >
                {title}
              </Text>
              {subtitle ? <SectionLabel>{subtitle}</SectionLabel> : null}
            </View>
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              accessibilityState={{ disabled: !dismissible }}
              disabled={!dismissible}
              onPress={close}
              style={{
                minHeight: 44,
                minWidth: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.pill,
                backgroundColor: colors.surfaceMuted,
                opacity: dismissible ? 1 : 0.5,
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
            style={{ flexShrink: 1 }}
            contentContainerStyle={{
              padding: spacing.xxl,
              gap: spacing.xxl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          {footer ? (
            <View
              style={{
                paddingTop: spacing.lg,
                gap: spacing.md,
                borderTopColor: colors.border,
                borderTopWidth: 1,
              }}
            >
              {footer}
            </View>
          ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
