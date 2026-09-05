import { FloatingTabBar, type TabName } from "@/components/floating-tab-bar";
import { useTranslation } from "@/localization";
import { useAppTheme } from "@/theme";
import { Tabs } from "expo-router";
import { View } from "react-native";

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const tabs = [
    { name: "today" as const, label: t("tabsToday") },
    { name: "progress" as const, label: t("tabsProgress") },
    { name: "groups" as const, label: t("tabsGroups") },
    { name: "settings" as const, label: t("tabsSettings") },
  ];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // The bar floats above the content, so the native one is replaced
        // entirely rather than restyled.
        sceneStyle: { backgroundColor: colors.background },
      }}
      tabBar={({ state, navigation }) => {
        const activeName = state.routeNames[state.index] as TabName;
        return (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <FloatingTabBar
              activeName={activeName}
              onSelect={(name) => navigation.navigate(name)}
              tabs={tabs}
            />
          </View>
        );
      }}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
