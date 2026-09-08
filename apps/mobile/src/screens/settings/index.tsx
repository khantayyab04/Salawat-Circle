import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  SectionLabel,
} from "@/components";
import { useTranslation } from "@/localization";
import { spacing } from "@/theme";
import { useRouter } from "expo-router";

export { SettingsScreen } from "./settings-screen";

export function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppCard style={{ gap: spacing.md }}>
        <SectionLabel tone="gold">{t("privacyOverviewEyebrow")}</SectionLabel>
        <AppText variant="cardTitle">{t("privacyOverviewTitle")}</AppText>
        <AppText>{t("privacyOverviewBody")}</AppText>
      </AppCard>
      <AppCard style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">{t("privacyGroupsTitle")}</AppText>
        <AppText>{t("privacyGroupsBody")}</AppText>
        <AppText variant="bodyStrong">{t("privacyReminderTitle")}</AppText>
        <AppText>{t("privacyReminderBody")}</AppText>
      </AppCard>
    </AppScreen>
  );
}

export function LegalScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppCard style={{ gap: spacing.md }}>
        <SectionLabel tone="gold">{t("legalGroupRulesEyebrow")}</SectionLabel>
        <AppText variant="cardTitle">{t("legalGroupRulesTitle")}</AppText>
        <AppText>{t("legalGroupRulesBody")}</AppText>
      </AppCard>
      <AppCard style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">{t("legalProductInfoTitle")}</AppText>
        <AppText>{t("legalProductInfoBody")}</AppText>
      </AppCard>
    </AppScreen>
  );
}

export function SupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <AppScreen>
      <AppCard style={{ gap: spacing.md }}>
        <SectionLabel tone="gold">{t("supportSelfHelpEyebrow")}</SectionLabel>
        <AppText variant="cardTitle">{t("supportTitle")}</AppText>
        <AppText>{t("supportBody")}</AppText>
      </AppCard>
      <AppCard style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">{t("supportEntriesTitle")}</AppText>
        <AppText>{t("supportEntriesBody")}</AppText>
        <AppButton
          label={t("supportEntriesAction")}
          onPress={() => router.push("/today")}
          variant="secondary"
        />
      </AppCard>
      <AppCard style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">{t("supportGroupsTitle")}</AppText>
        <AppText>{t("supportGroupsBody")}</AppText>
        <AppButton
          label={t("supportGroupsAction")}
          onPress={() => router.push("/groups")}
          variant="secondary"
        />
      </AppCard>
      <AppCard style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">{t("supportReminderTitle")}</AppText>
        <AppText>{t("supportReminderBody")}</AppText>
        <AppButton
          label={t("supportReminderAction")}
          onPress={() => router.push("/settings/reminder")}
          variant="secondary"
        />
      </AppCard>
    </AppScreen>
  );
}
