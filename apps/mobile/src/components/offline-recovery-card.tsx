import { useTranslation } from "@/localization";
import { Alert } from "react-native";
import { AppButton } from "./app-button";
import { AppCard } from "./app-card";
import { AppText } from "./app-text";

export function OfflineRecoveryCard({
  busy,
  onReset,
}: {
  busy: boolean;
  onReset(): Promise<void>;
}) {
  const { t } = useTranslation();
  const confirmReset = () => {
    Alert.alert(
      t("offlineRecoveryConfirmTitle"),
      t("offlineRecoveryConfirmBody"),
      [
        { text: t("commonCancel"), style: "cancel" },
        {
          text: t("offlineRecoveryConfirmAction"),
          style: "destructive",
          onPress: () => void onReset(),
        },
      ],
    );
  };

  return (
    <AppCard>
      <AppText accessibilityLiveRegion="polite" variant="bodyStrong">
        {t("offlineRecoveryTitle")}
      </AppText>
      <AppText>{t("offlineRecoveryBody")}</AppText>
      <AppButton
        label={t("offlineRecoveryAction")}
        loading={busy}
        onPress={confirmReset}
      />
    </AppCard>
  );
}
