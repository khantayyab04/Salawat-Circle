import { useTranslation } from "@/localization";
import { AppButton } from "./app-button";
import { AppCard } from "./app-card";
import { AppText } from "./app-text";

export function OfflineLoadErrorCard({
  busy,
  onRetry,
}: {
  busy: boolean;
  onRetry(): Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <AppCard>
      <AppText accessibilityLiveRegion="polite" variant="bodyStrong">
        {t("offlineLoadRetryTitle")}
      </AppText>
      <AppText>{t("offlineLoadRetryBody")}</AppText>
      <AppButton
        label={t("offlineLoadRetryAction")}
        loading={busy}
        onPress={() => void onRetry()}
      />
    </AppCard>
  );
}
