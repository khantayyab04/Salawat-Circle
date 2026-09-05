import { useAuth } from "@/lib/auth";
import { space } from "@/design-system";
import {
  normalizeManualInviteCode,
  toGroupsError,
  type GroupsErrorCode,
  type InviteSecret,
  useGroups,
} from "@/lib/groups";
import { formatAppNumber, type TranslationKey, useTranslation } from "@/localization";
import { Banner, Button, Card, Screen, Section, Text, TextField } from "@/ui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, View, type TextStyle } from "react-native";

const tabularNumberStyle: TextStyle = { fontVariant: ["tabular-nums"] };

function createSecretKey(secret: InviteSecret) {
  return `${secret.kind}:${secret.secret}`;
}

function formatNumeric(value: string, localeTag: string) {
  try {
    return formatAppNumber(BigInt(value), localeTag);
  } catch {
    return value;
  }
}

function resolveJoinErrorMessage(
  code: GroupsErrorCode,
  t: (key: TranslationKey) => string,
) {
  switch (code) {
    case "OFFLINE":
      return t("joinOfflineMessage");
    case "RATE_LIMITED":
      return t("joinRateLimitedMessage");
    case "INVITE_INVALID":
    case "NOT_FOUND":
    case "FORBIDDEN":
      return t("joinInvalidInviteMessage");
    default:
      return t("joinErrorMessage");
  }
}

function StateCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <Banner title={title} body={body} tone="error" />
      {action}
    </View>
  );
}

export function JoinScreen({
  initialSecret = null,
  allowManualCode = false,
  invalidRouteSecret = false,
}: {
  initialSecret?: InviteSecret | null;
  allowManualCode?: boolean;
  invalidRouteSecret?: boolean;
}) {
  const { replace } = useRouter();
  const { locale, localeTag, t } = useTranslation();
  const { clearPendingInvite, peekPendingInvite } = useAuth();
  const { invitePreview, mutation, previewInvite, acceptInvite } = useGroups();
  const [manualCode, setManualCode] = useState("");
  const [manualSecret, setManualSecret] = useState<InviteSecret | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewDataSecretKey, setPreviewDataSecretKey] = useState<string | null>(
    null,
  );
  const [errorCode, setErrorCode] = useState<GroupsErrorCode | null>(
    invalidRouteSecret ? "INVITE_INVALID" : null,
  );
  const activeSecret = manualSecret ?? initialSecret;
  const activeSecretKind = activeSecret?.kind ?? null;
  const activeSecretValue = activeSecret?.secret ?? null;
  const activeSecretKey = activeSecret ? createSecretKey(activeSecret) : null;
  const persistedTokenValue =
    initialSecret?.kind === "token" ? initialSecret.secret : null;
  const hasPersistedToken = persistedTokenValue !== null;

  useEffect(() => {
    if (!activeSecretKind || !activeSecretValue || !activeSecretKey) return;

    let mounted = true;
    void previewInvite(activeSecretKind, activeSecretValue)
      .then(() => {
        if (!mounted) return;
        setPreviewDataSecretKey(activeSecretKey);
      })
      .catch((error) => {
        if (!mounted) return;
        setPreviewDataSecretKey(null);
        setErrorCode(toGroupsError(error).code);
      });
    return () => {
      mounted = false;
    };
  }, [
    activeSecretKey,
    activeSecretKind,
    activeSecretValue,
    previewInvite,
    previewRevision,
  ]);

  const manualCodeNormalized = useMemo(
    () => normalizeManualInviteCode(manualCode),
    [manualCode],
  );
  const previewData =
    activeSecret && previewDataSecretKey === activeSecretKey
      ? invitePreview.data
      : null;
  const acceptPending = mutation.pending && mutation.kind === "accept_invite";
  const effectiveErrorCode = errorCode ?? (activeSecret ? invitePreview.errorCode : null);
  const resolvedErrorMessage = effectiveErrorCode
    ? resolveJoinErrorMessage(effectiveErrorCode, t)
    : null;
  const showBlockingError = !previewData && !!resolvedErrorMessage;

  const handlePreviewSubmit = useCallback(() => {
    if (!manualCodeNormalized) return;
    setManualCode(manualCodeNormalized);
    setErrorCode(null);
    setPreviewDataSecretKey(null);
    setManualSecret({ kind: "code", secret: manualCodeNormalized });
    setPreviewRevision((current) => current + 1);
  }, [manualCodeNormalized]);

  const handleConfirm = useCallback(async () => {
    if (!activeSecretKind || !activeSecretValue) return;
    setErrorCode(null);
    try {
      const response = await acceptInvite(
        activeSecretKind,
        activeSecretValue,
        locale,
      );
      if (hasPersistedToken) {
        const pendingToken = await peekPendingInvite().catch(() => null);
        if (pendingToken === activeSecretValue) {
          await clearPendingInvite().catch(() => undefined);
        }
      }
      replace({ pathname: "/groups/[id]", params: { id: response.group.id } });
    } catch (error) {
      setErrorCode(toGroupsError(error).code);
    }
  }, [
    acceptInvite,
    activeSecretKind,
    activeSecretValue,
    clearPendingInvite,
    hasPersistedToken,
    locale,
    peekPendingInvite,
    replace,
  ]);

  const abandonPersistedInvite = useCallback(async () => {
    setErrorCode(null);
    try {
      const pendingToken = await peekPendingInvite();
      if (pendingToken === persistedTokenValue) {
        await clearPendingInvite();
      }
      replace("/today");
    } catch {
      setErrorCode("INTERNAL");
    }
  }, [clearPendingInvite, peekPendingInvite, persistedTokenValue, replace]);

  const requestAbandon = useCallback(() => {
    Alert.alert(t("joinAbandonTitle"), t("joinAbandonBody"), [
      {
        text: t("commonCancel"),
        style: "cancel",
      },
      {
        text: t("joinAbandonAction"),
        style: "destructive",
        onPress: abandonPersistedInvite,
      },
    ]);
  }, [abandonPersistedInvite, t]);

  const memberCountLabel = previewData
    ? formatNumeric(previewData.group.memberCount, localeTag)
    : "0";

  return (
    <Screen>
      {allowManualCode ? (
        <Section title={t("joinManualCodeTitle")}>
          <Text variant="secondary">{t("joinBody")}</Text>
          <TextField
            autoCapitalize="characters"
            autoCorrect={false}
            label={t("joinManualCodeLabel")}
            value={manualCode}
            onChangeText={(value) => {
              setManualCode(value.toUpperCase());
              setErrorCode(null);
              if (manualSecret?.kind === "code") {
                setPreviewDataSecretKey(null);
                setManualSecret(null);
              }
            }}
          />
          <Text variant="secondary">{t("joinManualCodeHint")}</Text>
          <Button
            label={t("joinManualCodeSubmit")}
            disabled={!manualCodeNormalized}
            loading={invitePreview.status === "loading" && activeSecretKind === "code"}
            onPress={handlePreviewSubmit}
          />
        </Section>
      ) : null}

      {activeSecret && invitePreview.status === "loading" ? (
        <StateCard
          title={t("joinLoadingTitle")}
          body={t("joinLoadingBody")}
        />
      ) : null}

      {showBlockingError ? (
        <StateCard
          title={t("joinErrorTitle")}
          body={resolvedErrorMessage}
          action={
            activeSecret ? (
              <Button
                label={t("joinRefresh")}
                variant="secondary"
                style={{ alignSelf: "flex-start" }}
                onPress={() => {
                  if (!activeSecretKind || !activeSecretValue) return;
                  setErrorCode(null);
                  setPreviewDataSecretKey(null);
                  setPreviewRevision((current) => current + 1);
                }}
              />
            ) : invalidRouteSecret ? (
              <Button
                label={t("joinExitAction")}
                variant="secondary"
                style={{ alignSelf: "flex-start" }}
                onPress={() => replace("/today")}
              />
            ) : undefined
          }
        />
      ) : null}

      {previewData ? (
        <>
          <Section title={t("joinPreviewHeading")}>
            <Card>
              <Text variant="headline">{previewData.group.name}</Text>
              <Text style={tabularNumberStyle}>{`${memberCountLabel} ${t(
                "joinMembersLabel",
              )}`}</Text>
              <Text>{t("joinSharingExplanation")}</Text>
              <Text variant="secondary">
              {previewData.group.leaderboardAnonymous
                ? t("joinAnonymityOn")
                : t("joinAnonymityOff")}
              </Text>
              <Text variant="caption">{t("joinNoShareBeforeConfirm")}</Text>
            {previewData.alreadyActive ? (
                <Text variant="caption">{t("joinAlreadyActiveHint")}</Text>
            ) : null}
            </Card>
          </Section>
          {resolvedErrorMessage ? (
            <Banner
              title={t("joinErrorTitle")}
              body={resolvedErrorMessage}
              tone="error"
            />
          ) : null}
          <Button
            label={t("joinAction")}
            loading={acceptPending}
            onPress={() => {
              void handleConfirm();
            }}
          />
        </>
      ) : null}

      {hasPersistedToken ? (
        <Button
          label={t("joinAbandonAction")}
          variant="destructive"
          onPress={requestAbandon}
        />
      ) : null}
    </Screen>
  );
}
