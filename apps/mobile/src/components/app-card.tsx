import { radius, spacing, useAppTheme } from "@/theme";
import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
export function AppCard({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
