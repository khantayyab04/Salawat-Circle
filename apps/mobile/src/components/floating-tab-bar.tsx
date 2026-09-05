import { radius, shadows, spacing, useAppTheme } from "@/theme";
// Icons are imported one by one rather than from the package barrel: the
// barrel re-exports well over a thousand icons, which slows bundling and tests
// down considerably.
import Activity from "lucide-react-native/icons/activity";
import Home from "lucide-react-native/icons/house";
import Settings from "lucide-react-native/icons/settings";
import Users from "lucide-react-native/icons/users";
import type { ComponentType } from "react";
import { Pressable, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type TabName = "today" | "progress" | "groups" | "settings";

export type TabDescriptor = { name: TabName; label: string };

const icons: Record<TabName, ComponentType<{ color: string; size: number }>> = {
  today: Home,
  progress: Activity,
  groups: Users,
  settings: Settings,
};

/**
 * The floating pill navigation from the design: a deep green bar that hovers
 * above the content with a gold capsule marking the active destination.
 *
 * The bar is positioned by its parent and only owns its own bottom inset, so
 * it always clears the home indicator without the screens having to know about
 * safe areas.
 */
export function FloatingTabBar({
  tabs,
  activeName,
  onSelect,
  style,
  ...props
}: Omit<ViewProps, "children"> & {
  tabs: readonly TabDescriptor[];
  activeName: TabName;
  onSelect: (name: TabName) => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        {
          paddingHorizontal: spacing.xxl,
          paddingBottom: insets.bottom,
        },
        style,
      ]}
      {...props}
    >
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.primary,
          borderRadius: radius.pill,
          borderCurve: "continuous",
          padding: spacing.sm,
          gap: spacing.xs,
          boxShadow: shadows.floating,
        }}
      >
        {tabs.map((tab) => {
          const selected = tab.name === activeName;
          const Icon = icons[tab.name];
          return (
            <Pressable
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab.name}
              onPress={() => onSelect(tab.name)}
              style={{
                flex: 1,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.pill,
                borderCurve: "continuous",
                backgroundColor: selected ? colors.gold : "transparent",
              }}
            >
              <Icon
                color={selected ? colors.textOnPrimary : colors.primarySoft}
                size={22}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
