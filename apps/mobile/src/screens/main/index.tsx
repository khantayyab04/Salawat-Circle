import {
  AppButton,
  AppScreen,
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
