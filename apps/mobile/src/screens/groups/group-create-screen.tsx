import { useEntries } from "@/lib/entries";
import { useGroups } from "@/lib/groups";
import { useTranslation, type TranslationKey } from "@/localization";
import { space } from "@/design-system";
import { Button, Screen, Section, Text, TextField } from "@/ui";
import { Host, Switch } from "@expo/ui";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

function normalizeGroupName(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

function visibleCharLength(value: string) {
  return Array.from(value).length;
}

function isValidIanaTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function resolveDeviceTimeZone() {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && isValidIanaTimeZone(detected)) {
      return detected;
    }
  } catch {
    // fall through to UTC fallback
  }
  return "UTC";
}

function resolvePreferredTimeZone(value: string | null | undefined) {
  const candidate = value?.trim();
  if (candidate && isValidIanaTimeZone(candidate)) {
    return candidate;
  }

  return resolveDeviceTimeZone();
}

function createErrorKey(code: string): TranslationKey {
  switch (code) {
    case "OFFLINE":
      return "groupCreateErrorOffline";
    case "NAME_REJECTED":
      return "groupCreateErrorNameRejected";
    case "GROUP_LIMIT_REACHED":
      return "groupCreateErrorGroupLimitReached";
    case "CONSENT_REQUIRED":
      return "groupCreateErrorConsentRequired";
    case "RATE_LIMITED":
      return "groupCreateErrorRateLimited";
    case "INVALID_INPUT":
      return "groupCreateErrorInvalidInput";
    default:
      return "groupCreateErrorGeneral";
  }
}

function readErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "INTERNAL";
}

export function GroupCreateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const entries = useEntries();
  const groups = useGroups();

  const [name, setName] = useState("");
  const [timeZone, setTimeZone] = useState(() =>
    resolvePreferredTimeZone(entries.timeZone),
  );
  const [timeZoneValid, setTimeZoneValid] = useState(true);
  const [timeZoneTouched, setTimeZoneTouched] = useState(false);
  const [leaderboardAnonymous, setLeaderboardAnonymous] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);
  const submitGuardRef = useRef(false);

  const normalizedName = normalizeGroupName(name);
  const normalizedTimeZone = timeZone.trim();
  const nameLength = visibleCharLength(normalizedName);
  const validName = nameLength >= 2 && nameLength <= 50;
  const validTimeZone = normalizedTimeZone.length > 0 && timeZoneValid;
  const submitting =
    groups.mutation.pending && groups.mutation.kind === "create_group";
  const canSubmit = !submitting && validName && validTimeZone && rulesAccepted;
  const showServerTimeZoneError = submitErrorCode === "INVALID_INPUT";
  const timeZoneError =
    showServerTimeZoneError || (timeZoneTouched && !validTimeZone)
      ? t(
          showServerTimeZoneError
            ? "groupCreateErrorInvalidInput"
            : "groupTimezoneInvalid",
        )
      : undefined;

  const validateTimeZone = (value: string) => {
    const normalized = value.trim();
    return normalized.length > 0 && isValidIanaTimeZone(normalized);
  };

  const handleSubmit = async () => {
    if (submitGuardRef.current) return;
    if (!canSubmit) {
      if (!validateTimeZone(normalizedTimeZone)) {
        setTimeZoneTouched(true);
        setTimeZoneValid(false);
      }
      return;
    }
    setSubmitErrorCode(null);
    submitGuardRef.current = true;

    try {
      const result = await groups.createGroup(
        normalizedName,
        normalizedTimeZone,
        leaderboardAnonymous,
        rulesAccepted,
      );
      router.replace({ pathname: "/groups/[id]", params: { id: result.group.id } });
    } catch (error) {
      const errorCode = readErrorCode(error);
      if (errorCode === "INVALID_INPUT") {
        setTimeZoneTouched(true);
      }
      setSubmitErrorCode(errorCode);
    } finally {
      submitGuardRef.current = false;
    }
  };

  return (
    <Screen>
      <Section>
        <TextField
          testID="group-create-name-input"
          label={t("groupNameLabel")}
          error={name.length > 0 && !validName ? t("groupNameInvalid") : undefined}
          value={name}
          onChangeText={(value) => {
            setSubmitErrorCode(null);
            setName(value);
          }}
        />
        <Text variant="secondary">{t("groupNameHint")}</Text>
        <TextField
          testID="group-create-timezone-input"
          autoCapitalize="none"
          autoCorrect={false}
          label={t("groupTimezoneLabel")}
          error={timeZoneError}
          value={timeZone}
          onChangeText={(value) => {
            setSubmitErrorCode(null);
            setTimeZoneTouched(true);
            setTimeZoneValid(validateTimeZone(value));
            setTimeZone(value);
          }}
        />
        <Text variant="secondary">{t("groupTimezoneHint")}</Text>
      </Section>
      <Section title={t("groupCreateOptionsTitle")}>
        <View style={{ gap: space.sm }}>
          <Host matchContents>
            <Switch
              testID="group-create-anonymous-switch"
              value={leaderboardAnonymous}
              disabled={submitting}
              label={t("groupCreateAnonymousLabel")}
              onValueChange={(value) => {
                setSubmitErrorCode(null);
                setLeaderboardAnonymous(value);
              }}
            />
          </Host>
          <Text variant="secondary">{t("groupCreateAnonymousHint")}</Text>
          <Text variant="secondary">{t("groupCreateAnonymousCaveat")}</Text>
        </View>
      </Section>
      <Section title={t("groupCreateConsentTitle")}>
        <View style={{ gap: space.sm }}>
          <Host matchContents>
            <Switch
              testID="group-create-rules-switch"
              value={rulesAccepted}
              disabled={submitting}
              label={t("groupCreateRulesLabel")}
              onValueChange={(value) => {
                setSubmitErrorCode(null);
                setRulesAccepted(value);
              }}
            />
          </Host>
          <Text variant="secondary">{t("groupCreateRulesHint")}</Text>
          <Button
            label={t("groupCreateLegalAction")}
            variant="tertiary"
            accessibilityHint={t("groupCreateLegalActionHint")}
            onPress={() => router.push("/account/legal")}
            style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
          />
        </View>
      </Section>
      {submitErrorCode ? (
        <Text accessibilityLiveRegion="polite">
          {t(createErrorKey(submitErrorCode))}
        </Text>
      ) : null}
      <Button
        disabled={!canSubmit}
        loading={submitting}
        label={t("groupsCreate")}
        onPress={handleSubmit}
      />
    </Screen>
  );
}
