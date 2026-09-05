import { AppButton, AppCard, AppScreen, AppText } from "@/components";
import { useTranslation } from "@/localization";
import { spacing } from "@/theme";

export { SettingsScreen } from "./settings-screen";

export function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppButton disabled label={t("privacyExport")} variant="secondary" />
      <AppButton disabled label={t("privacyDelete")} variant="destructive" />
    </AppScreen>
  );
}

export function LegalScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppCard style={{ gap: spacing.lg }}>
        <AppText>{t("legalPrivacy")}</AppText>
        <AppText>{t("legalTerms")}</AppText>
        <AppText>{t("legalImprint")}</AppText>
      </AppCard>
    </AppScreen>
  );
}

export function SupportScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppCard>
        <AppText>{t("supportBody")}</AppText>
      </AppCard>
    </AppScreen>
  );
}
