import { spacing, useAppTheme } from "@/theme";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ScrollView,
  View,
  type ScrollViewProps,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Height of the floating tab bar plus the gap the design leaves under it. */
const FLOATING_BAR_CLEARANCE = 92;

export function AppScreen({
  children,
  contentContainerStyle,
  header,
  floatingTabBar = false,
  ...props
}: PropsWithChildren<
  ScrollViewProps & {
    /** Rendered above the scroll area and kept fixed while it scrolls. */
    header?: ReactNode;
    /** Reserves room so the floating bar never covers the last item. */
    floatingTabBar?: boolean;
  }
>) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const bottomInset = floatingTabBar
    ? FLOATING_BAR_CLEARANCE + insets.bottom
    : spacing.xl;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          {
            flexGrow: 1,
            gap: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: bottomInset,
            width: "100%",
            // On tablets the design would stretch uncomfortably wide, so the
            // content column stays readable and centred instead.
            maxWidth: width > 760 ? 720 : undefined,
            alignSelf: "center",
          },
          contentContainerStyle,
        ]}
        {...props}
      >
        {children}
      </ScrollView>
    </View>
  );
}
