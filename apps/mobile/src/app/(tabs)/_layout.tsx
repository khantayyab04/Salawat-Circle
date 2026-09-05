import { useTranslation } from "@/localization";
import { useAppTheme } from "@/theme";
import { tabSymbols } from "@/lib/jumuah/navigation-symbols";
import { NativeTabs } from "expo-router/unstable-native-tabs";
export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors, isJumuah } = useAppTheme();
  const symbols = tabSymbols(isJumuah);
  return (
    <NativeTabs backgroundColor={colors.surface} tintColor={colors.accent}>
      <NativeTabs.Trigger
        name="today"
        accessibilityLabel={t("tabsToday")}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Icon sf={symbols.today} md="today" />
        <NativeTabs.Trigger.Label>{t("tabsToday")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="progress"
        accessibilityLabel={t("tabsProgress")}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Icon sf={symbols.progress} md="bar_chart" />
        <NativeTabs.Trigger.Label>{t("tabsProgress")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="groups"
        accessibilityLabel={t("tabsGroups")}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Icon sf={symbols.groups} md="groups" />
        <NativeTabs.Trigger.Label>{t("tabsGroups")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
