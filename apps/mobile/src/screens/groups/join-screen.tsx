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
import { View, type TextStyle, type ViewStyle } from "react-native";

const retryButtonStyle: ViewStyle = { alignSelf: "flex-start" };
const tabularNumberStyle: TextStyle = { fontVariant: ["tabular-nums"] };

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
  const { consumePendingInvite } = useAuth();
  const { invitePreview, mutation, previewInvite, acceptInvite } = useGroups();
  const [manualCode, setManualCode] = useState("");
  const [manualSecret, setManualSecret] = useState<InviteSecret | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [errorCode, setErrorCode] = useState<GroupsErrorCode | null>(
    invalidRouteSecret ? "INVITE_INVALID" : null,
  );
  const activeSecret = manualSecret ?? initialSecret;
  const activeSecretKind = activeSecret?.kind ?? null;
  const activeSecretValue = activeSecret?.secret ?? null;

  useEffect(() => {
    if (!activeSecretKind || !activeSecretValue) return;
    let mounted = true;
    void previewInvite(activeSecretKind, activeSecretValue)
      .catch((error) => {
        if (!mounted) return;
        setErrorCode(toGroupsError(error).code);
      });
    return () => {
      mounted = false;
    };
  }, [activeSecretKind, activeSecretValue, previewInvite, previewRevision]);

  const manualCodeNormalized = useMemo(
    () => normalizeManualInviteCode(manualCode),
    [manualCode],
  );
  const previewData = activeSecret ? invitePreview.data : null;
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
      await consumePendingInvite().catch(() => null);
      replace({ pathname: "/groups/[id]", params: { id: response.group.id } });
    } catch (error) {
      setErrorCode(toGroupsError(error).code);
    }
  }, [
    acceptInvite,
    activeSecretKind,
    activeSecretValue,
    consumePendingInvite,
    locale,
    replace,
  ]);

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
                  setPreviewRevision((current) => current + 1);
                }}
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
    </AppScreen>
  );
}
