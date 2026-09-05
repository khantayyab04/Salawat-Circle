import { useReminder } from "@/lib/reminder";
import { fromPickerDate, toPickerDate } from "@/lib/reminder/reminder-time";
import { useTranslation } from "@/localization";
import { Banner, Button, Card, Screen, Text } from "@/ui";
import { Host, Switch } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { Linking } from "react-native";

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
    <Screen>
      <Card>
        <Text variant="headline">{t("reminderTitle")}</Text>
        <Text>{t("reminderPurpose")}</Text>
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
      </Card>
      <Card>
        <Text variant="headline">{t("reminderTimeLabel")}</Text>
        <Host matchContents>
          <DateTimePicker
            mode="time"
            presentation="inline"
            value={toPickerDate(reminder.time)}
            onValueChange={(_event, value) => {
              void reminder.setTime(fromPickerDate(value));
            }}
          />
        </Host>
      </Card>
      <Card>
        <Text variant="headline">{t("reminderJumuahTitle")}</Text>
        <Text>{t("reminderJumuahPurpose")}</Text>
        <Host matchContents>
          <Switch
            label={t("reminderJumuahEnabledLabel")}
            value={reminder.jumuah.enabled}
            disabled={reminder.busy}
            onValueChange={(enabled) => {
              void (
                enabled ? reminder.enableJumuah() : reminder.disableJumuah()
              );
            }}
          />
        </Host>
      </Card>
      <Card>
        <Text variant="headline">{t("reminderJumuahTimeLabel")}</Text>
        <Host matchContents>
          <DateTimePicker
            mode="time"
            presentation="inline"
            value={toPickerDate(reminder.jumuah.time)}
            onValueChange={(_event, value) => {
              void reminder.setJumuahTime(fromPickerDate(value));
            }}
          />
        </Host>
      </Card>
      <Banner
        body={permissionCopy}
        title={t("reminderPermissionTitle")}
        tone={reminder.permission === "blocked" ? "error" : "info"}
      />
      {reminder.permission === "blocked" ? (
        <Button
          label={t("reminderOpenSettings")}
          onPress={() => void Linking.openSettings()}
          variant="secondary"
        />
      ) : null}
      <Text variant="caption">{t("reminderDeviceOnly")}</Text>
    </Screen>
  );
}
