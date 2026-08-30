import { spacing, useAppTheme } from "@/theme";
import type { PropsWithChildren } from "react";
import {
  ScrollView,
  type ScrollViewProps,
  useWindowDimensions,
} from "react-native";

export function AppScreen({
  children,
  contentContainerStyle,
  ...props
}: PropsWithChildren<ScrollViewProps>) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        {
          flexGrow: 1,
          gap: spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
          width: "100%",
          maxWidth: width > 760 ? 720 : undefined,
          alignSelf: "center",
        },
        contentContainerStyle,
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
