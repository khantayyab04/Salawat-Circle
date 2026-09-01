import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  FormField,
  StatusBanner,
} from "@/components";
import { useAuth } from "@/lib/auth";
import {
  normalizeManualInviteCode,
  toGroupsError,
  type GroupsErrorCode,
  type InviteSecret,
  useGroups,
} from "@/lib/groups";
import { formatAppNumber, type TranslationKey, useTranslation } from "@/localization";
import { spacing } from "@/theme";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, View, type TextStyle, type ViewStyle } from "react-native";

const retryButtonStyle: ViewStyle = { alignSelf: "flex-start" };
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
    <View style={{ gap: spacing.sm }}>
      <AppCard
        accessible
        accessibilityRole="alert"
        style={{ alignItems: "flex-start", justifyContent: "center", minHeight: 160 }}
      >
        <AppText variant="title">{title}</AppText>
        <AppText>{body}</AppText>
      </AppCard>
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
    <AppScreen>
      {allowManualCode ? (
        <AppCard style={{ gap: spacing.md }}>
          <AppText variant="title">{t("joinManualCodeTitle")}</AppText>
          <AppText>{t("joinBody")}</AppText>
          <FormField
            autoCapitalize="characters"
            autoCorrect={false}
            label={t("joinManualCodeLabel")}
            hint={t("joinManualCodeHint")}
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
          <AppButton
            label={t("joinManualCodeSubmit")}
            disabled={!manualCodeNormalized}
            loading={invitePreview.status === "loading" && activeSecretKind === "code"}
            onPress={handlePreviewSubmit}
          />
        </AppCard>
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
              <AppButton
                label={t("joinRefresh")}
                variant="secondary"
                style={retryButtonStyle}
                onPress={() => {
                  if (!activeSecretKind || !activeSecretValue) return;
                  setErrorCode(null);
                  setPreviewDataSecretKey(null);
                  setPreviewRevision((current) => current + 1);
                }}
              />
            ) : invalidRouteSecret ? (
              <AppButton
                label={t("joinExitAction")}
                variant="secondary"
                style={retryButtonStyle}
                onPress={() => replace("/today")}
              />
            ) : undefined
          }
        />
      ) : null}

      {previewData ? (
        <>
          <AppCard style={{ gap: spacing.sm }}>
            <AppText variant="title">{t("joinPreviewHeading")}</AppText>
            <AppText variant="bodyStrong">{previewData.group.name}</AppText>
            <AppText style={tabularNumberStyle}>{`${memberCountLabel} ${t(
              "joinMembersLabel",
            )}`}</AppText>
            <AppText>{t("joinSharingExplanation")}</AppText>
            <AppText>
              {previewData.group.leaderboardAnonymous
                ? t("joinAnonymityOn")
                : t("joinAnonymityOff")}
            </AppText>
            <AppText variant="caption">{t("joinNoShareBeforeConfirm")}</AppText>
            {previewData.alreadyActive ? (
              <AppText variant="caption">{t("joinAlreadyActiveHint")}</AppText>
            ) : null}
          </AppCard>
          {resolvedErrorMessage ? (
            <StatusBanner
              title={t("joinErrorTitle")}
              body={resolvedErrorMessage}
              tone="error"
            />
          ) : null}
          <AppButton
            label={t("joinAction")}
            loading={acceptPending}
            onPress={() => {
              void handleConfirm();
            }}
          />
        </>
      ) : null}

      {hasPersistedToken ? (
        <AppButton
          label={t("joinAbandonAction")}
          variant="destructive"
          onPress={requestAbandon}
        />
      ) : null}
    </AppScreen>
  );
}
