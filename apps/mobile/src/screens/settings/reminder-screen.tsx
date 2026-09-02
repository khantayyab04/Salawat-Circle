import {
  AppCard,
  AppScreen,
  AppText,
} from "@/components";
import { useReminder } from "@/lib/reminder";
import { fromPickerDate, toPickerDate } from "@/lib/reminder/reminder-time";
import { useTranslation } from "@/localization";
import { Host, Switch } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Linking, Pressable, View } from "react-native";

export function ReminderSettingsScreen() {
  const { t } = useTranslation();
  const reminder = useReminder();
  const permissionCopy =
    reminder.permission === "granted"
      ? t("reminderPermissionGranted")
      : reminder.permission === "denied"
        ? t("reminderPermissionDenied")
        : reminder.permission === "blocked"
          ? t("reminderPermissionBlocked")
          : t("reminderPermissionNotAsked");
  return (
    <AppScreen>
      <AppCard>
        <AppText variant="bodyStrong">{t("reminderTitle")}</AppText>
        <AppText>{t("reminderPurpose")}</AppText>
        <Host matchContents>
          <Switch
            label={t("reminderEnabledLabel")}
            value={reminder.enabled}
            disabled={reminder.busy}
            onValueChange={(enabled) => {
              void (enabled ? reminder.enable() : reminder.disable());
            }}
          />
        </Host>
      </AppCard>
      <AppCard>
        <AppText variant="bodyStrong">{t("reminderTimeLabel")}</AppText>
        <DateTimePicker
          mode="time"
          presentation="inline"
          value={toPickerDate(reminder.time)}
          onValueChange={(_event, value) => {
            void reminder.setTime(fromPickerDate(value));
          }}
        />
      </AppCard>
      <AppText accessibilityLiveRegion="polite">{permissionCopy}</AppText>
      {reminder.permission === "blocked" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
        >
          <AppText variant="bodyStrong">{t("reminderOpenSettings")}</AppText>
        </Pressable>
      ) : null}
      <View>
        <AppText variant="caption">{t("reminderDeviceOnly")}</AppText>
      </View>
    </AppScreen>
  );
}
