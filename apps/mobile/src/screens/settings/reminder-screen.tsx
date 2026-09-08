import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  StatusBanner,
} from "@/components";
import { useSunsetLocation } from "@/lib/blessings/use-sunset-location";
import { useReminder } from "@/lib/reminder";
import { fromPickerDate, toPickerDate } from "@/lib/reminder/reminder-time";
import { useTranslation } from "@/localization";
import { Host, Switch } from "@expo/ui";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { frame } from "@expo/ui/swift-ui/modifiers";
import { Linking, Platform, Pressable, View } from "react-native";

const fullWidthToggleModifiers = [
  frame({ maxWidth: 10_000, alignment: "leading" }),
];

export function ReminderSettingsScreen() {
  const { t } = useTranslation();
  const reminder = useReminder();
  const location = useSunsetLocation();
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
      {reminder.error ? (
        <StatusBanner
          body={t("reminderChangeFailedBody")}
          title={t("reminderChangeFailedTitle")}
          tone="error"
        />
      ) : null}
      <AppCard>
        <AppText variant="bodyStrong">{t("reminderTitle")}</AppText>
        <AppText>{t("reminderPurpose")}</AppText>
        <Host matchContents>
          <Switch
            label={t("reminderEnabledLabel")}
            modifiers={fullWidthToggleModifiers}
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
          disabled={reminder.busy}
          mode="time"
          presentation="inline"
          value={toPickerDate(reminder.time)}
          onValueChange={(_event, value) => {
            if (reminder.busy) return;
            void reminder.setTime(fromPickerDate(value));
          }}
        />
      </AppCard>
      <AppCard>
        <AppText variant="bodyStrong">{t("reminderJumuahTitle")}</AppText>
        <AppText>{t("reminderJumuahPurpose")}</AppText>
        <Host matchContents>
          <Switch
            label={t("reminderJumuahEnabledLabel")}
            modifiers={fullWidthToggleModifiers}
            value={reminder.jumuah.enabled}
            disabled={reminder.busy}
            onValueChange={(enabled) => {
              void (enabled ? reminder.enableJumuah() : reminder.disableJumuah());
            }}
          />
        </Host>
        <AppText variant="bodyStrong">{t("reminderJumuahTimeLabel")}</AppText>
        <DateTimePicker
          disabled={reminder.busy}
          mode="time"
          presentation="inline"
          value={toPickerDate(reminder.jumuah.time)}
          onValueChange={(_event, value) => {
            if (reminder.busy) return;
            void reminder.setJumuahTime(fromPickerDate(value));
          }}
        />
        <AppText variant="bodyStrong">{t("reminderJumuahStartTitle")}</AppText>
        <AppText>{t("reminderJumuahStartBody")}</AppText>
        <AppText accessibilityLiveRegion="polite" variant="caption">
          {t(location.status === "denied" ? (Platform.OS === "web" ? "blessingsLocationBrowserDenied" : "blessingsLocationDenied") : location.enabled ? "reminderJumuahLocationActive" : "blessingsLocationCalendar")}
        </AppText>
        {location.enabled ? (
          <AppButton
            label={t("blessingsLocationDisable")}
            variant="secondary"
            onPress={location.disable}
          />
        ) : (
          <AppButton
            label={t("reminderJumuahLocationEnable")}
            loading={location.status === "loading"}
            onPress={() => void location.enable()}
          />
        )}
        {location.status === "denied" && Platform.OS !== "web" ? (
          <AppButton
            label={t("blessingsLocationSettings")}
            variant="secondary"
            onPress={() => void Linking.openSettings().catch(() => {})}
          />
        ) : null}
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
