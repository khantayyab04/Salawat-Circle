import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  StateFeedback,
} from "@/components";
import { useTranslation } from "@/localization";
import { View } from "react-native";
export function GroupMembersScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <StateFeedback state="empty">
        <View />
      </StateFeedback>
      <AppButton disabled label={t("commonUnavailable")} variant="secondary" />
    </AppScreen>
  );
}
export function GroupInvitesScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <StateFeedback state="empty">
        <View />
      </StateFeedback>
      <AppButton disabled label={t("commonUnavailable")} variant="secondary" />
    </AppScreen>
  );
}
export function JoinScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <AppCard>
        <AppText variant="title">{t("joinTitle")}</AppText>
        <AppText>{t("joinBody")}</AppText>
      </AppCard>
      <AppButton disabled label={t("joinAction")} />
    </AppScreen>
  );
}
