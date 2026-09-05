import { AppHeader } from "@/components/app-header";
import { AppScreen } from "@/components";
import { useTranslation } from "@/localization";

export function ProgressScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen
      floatingTabBar
      header={
        <AppHeader
          subtitle={t("headerProgressEyebrow")}
          title={t("appName")}
        />
      }
    />
  );
}
