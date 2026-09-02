import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
} from "@/components";
import { parseDisplayName, parseTimeZone } from "@/lib/auth/validation";
import { useAuth } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/auth/supabase-client";
import {
  createSupabaseSettingsGateway,
  type SettingsProfile,
} from "@/lib/settings/settings-gateway";
import { getTimeZoneOptions } from "@/lib/settings/timezones";
import { useTranslation } from "@/localization";
import { Host, Picker } from "@expo/ui";
import { useEffect, useMemo, useState } from "react";

type SettingsGateway = {
  loadProfile(): Promise<SettingsProfile>;
};

function deviceTimeZone() {
  try {
    return parseTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "UTC";
  }
}

export function ProfileSettingsScreen({ gateway }: { gateway?: SettingsGateway }) {
  const { t, locale } = useTranslation();
  const auth = useAuth();
  const [loaded, setLoaded] = useState<SettingsProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [timeZone, setTimeZone] = useState(deviceTimeZone);
  const [loadError, setLoadError] = useState(false);
  const activeGateway = useMemo(
    () => gateway ?? createSupabaseSettingsGateway(getSupabaseClient()),
    [gateway],
  );
  const detectedTimeZone = useMemo(() => deviceTimeZone(), []);
  const timeZones = useMemo(
    () => getTimeZoneOptions(detectedTimeZone, timeZone),
    [detectedTimeZone, timeZone],
  );

  useEffect(() => {
    let active = true;
    void activeGateway
      .loadProfile()
      .then((profile) => {
        if (!active) return;
        setLoaded(profile);
        setDisplayName(profile.displayName);
        setTimeZone(profile.timeZone);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [activeGateway]);

  const nameValid = (() => {
    try {
      parseDisplayName(displayName);
      return true;
    } catch {
      return false;
    }
  })();

  const save = async () => {
    try {
      await auth.saveProfile(
        parseDisplayName(displayName),
        parseTimeZone(timeZone),
        locale,
      );
      setLoaded({ displayName: parseDisplayName(displayName), timeZone });
    } catch {
      // Stable localized error state remains owned by AuthProvider.
    }
  };

  return (
    <AppScreen>
      {loadError ? (
        <AppText accessibilityLiveRegion="polite">{t("settingsProfileLoadFailed")}</AppText>
      ) : null}
      {auth.errorCode === "PROFILE_SAVE_FAILED" ? (
        <AppText accessibilityLiveRegion="polite">{t("profileSaveFailed")}</AppText>
      ) : null}
      <FormField
        label={t("profileNameLabel")}
        hint={t("profileNameHint")}
        error={displayName.length > 0 && !nameValid ? t("profileNameInvalid") : undefined}
        value={displayName}
        onChangeText={(value) => {
          auth.clearError();
          setDisplayName(value);
        }}
      />
      <AppCard>
        <AppText variant="bodyStrong">{t("profileTimezoneLabel")}</AppText>
        <AppText variant="caption">{t("settingsProfileTimezoneHint")}</AppText>
        <Host matchContents>
          <Picker<string>
            appearance="menu"
            selectedValue={timeZone}
            onValueChange={setTimeZone}
          >
            {timeZones.map((zone) => (
              <Picker.Item key={zone} label={zone} value={zone} />
            ))}
          </Picker>
        </Host>
      </AppCard>
      <AppText variant="caption">{t("settingsProfileTimezoneImpact")}</AppText>
      <AppButton
        disabled={!loaded || !nameValid || auth.busy}
        loading={auth.busy}
        label={t("settingsProfileSave")}
        onPress={() => void save()}
      />
    </AppScreen>
  );
}
