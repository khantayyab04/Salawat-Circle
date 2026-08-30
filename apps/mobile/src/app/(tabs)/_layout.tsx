import { useTranslation } from "@/localization";
import { useAppTheme } from "@/theme";
import { NativeTabs } from "expo-router/unstable-native-tabs";
export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <NativeTabs backgroundColor={colors.surface} tintColor={colors.accent}>
      <NativeTabs.Trigger
        name="today"
        accessibilityLabel={t("tabsToday")}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Icon sf="calendar" md="today" />
        <NativeTabs.Trigger.Label>{t("tabsToday")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="groups"
        accessibilityLabel={t("tabsGroups")}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Icon sf="person.3.fill" md="groups" />
        <NativeTabs.Trigger.Label>{t("tabsGroups")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="settings"
        accessibilityLabel={t("tabsSettings")}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>{t("tabsSettings")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
