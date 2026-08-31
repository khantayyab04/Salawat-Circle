import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  StatusBanner,
} from "@/components";
import {
  buildInviteLink,
  toGroupsError,
  type GroupInvite,
  useGroups,
  type GroupsErrorCode,
} from "@/lib/groups";
import {
  formatAppDate,
  formatAppNumber,
  formatAppTime,
  type TranslationKey,
  useTranslation,
} from "@/localization";
import { spacing } from "@/theme";
import * as Clipboard from "expo-clipboard";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Share, View, type TextStyle, type ViewStyle } from "react-native";

const tabularNumberStyle: TextStyle = { fontVariant: ["tabular-nums"] };
const retryButtonStyle: ViewStyle = { alignSelf: "flex-start" };

type InviteErrorCopy = {
  title: string;
  body: string;
  tone: "offline" | "error";
};

type InviteSecretCard = {
  groupId: string;
  inviteId: string;
  link: string;
  code: string;
};

type InviteActionErrorState = {
  groupId: string;
  code: GroupsErrorCode;
};

type PendingRevokeState = {
  groupId: string;
  inviteId: string;
};

function readGroupId(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

function formatNumeric(value: string, localeTag: string) {
  try {
    return formatAppNumber(BigInt(value), localeTag);
  } catch {
    return value;
  }
}

function formatInviteTimestamp(
  value: string,
  localeTag: string,
  timeZone: string,
) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${formatAppDate(parsed, localeTag, timeZone)} ${formatAppTime(
    parsed,
    localeTag,
    timeZone,
  )}`;
}

function resolveStatusLabel(
  status: GroupInvite["status"],
  t: (key: TranslationKey) => string,
) {
  switch (status) {
    case "active":
      return t("groupInvitesStatusActive");
    case "expired":
      return t("groupInvitesStatusExpired");
    case "exhausted":
      return t("groupInvitesStatusExhausted");
    case "revoked":
      return t("groupInvitesStatusRevoked");
    default:
      return status;
  }
}

function resolveInviteErrorCopy(
  code: GroupsErrorCode,
  t: (key: TranslationKey) => string,
): InviteErrorCopy {
  switch (code) {
    case "OFFLINE":
      return {
        title: t("groupInvitesOfflineTitle"),
        body: t("groupInvitesOfflineBody"),
        tone: "offline",
      };
    case "RATE_LIMITED":
      return {
        title: t("groupInvitesRateLimitedTitle"),
        body: t("groupInvitesRateLimitedBody"),
        tone: "error",
      };
    case "FORBIDDEN":
      return {
        title: t("stateForbiddenTitle"),
        body: t("stateForbiddenBody"),
        tone: "error",
      };
    case "NOT_FOUND":
      return {
        title: t("groupInvitesNotFoundTitle"),
        body: t("groupInvitesNotFoundBody"),
        tone: "error",
      };
    default:
      return {
        title: t("groupInvitesErrorTitle"),
        body: t("groupInvitesErrorBody"),
        tone: "error",
      };
  }
}

function resolveInviteActionErrorCopy(
  code: GroupsErrorCode,
  t: (key: TranslationKey) => string,
): InviteErrorCopy {
  switch (code) {
    case "OFFLINE":
      return {
        title: t("groupInvitesOfflineTitle"),
        body: t("groupInvitesOfflineBody"),
        tone: "offline",
      };
    case "RATE_LIMITED":
      return {
        title: t("groupInvitesRateLimitedTitle"),
        body: t("groupInvitesRateLimitedBody"),
        tone: "error",
      };
    case "FORBIDDEN":
      return {
        title: t("stateForbiddenTitle"),
        body: t("stateForbiddenBody"),
        tone: "error",
      };
    case "NOT_FOUND":
      return {
        title: t("groupInvitesNotFoundTitle"),
        body: t("groupInvitesNotFoundBody"),
        tone: "error",
      };
    default:
      return {
        title: t("groupInvitesActionErrorTitle"),
        body: t("groupInvitesActionErrorBody"),
        tone: "error",
      };
  }
}

function StateCard({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
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
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          variant="secondary"
          style={retryButtonStyle}
          onPress={onAction}
        />
      ) : null}
    </View>
  );
}

export function GroupInvitesScreen() {
  const { t, localeTag } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const {
    online,
    groups,
    invites,
    mutation,
    loadInvites,
    createInvite,
    revokeInvite,
  } = useGroups();

  const groupId = readGroupId(id);
  const [secretCard, setSecretCard] = useState<InviteSecretCard | null>(null);
  const [actionError, setActionError] = useState<InviteActionErrorState | null>(
    null,
  );
  const [pendingRevoke, setPendingRevoke] = useState<PendingRevokeState | null>(null);

  const group = useMemo(() => {
    if (!groupId) return null;
    return groups.items.find((entry) => entry.id === groupId) ?? null;
  }, [groupId, groups.items]);
  const isOwner = group?.role === "owner";
  const timeZone = group?.timezone ?? "UTC";
  const visibleSecretCard =
    secretCard && secretCard.groupId === groupId ? secretCard : null;
  const visibleSecretInviteId = visibleSecretCard?.inviteId ?? null;
  const pendingRevokeInviteId =
    pendingRevoke?.groupId === groupId ? pendingRevoke.inviteId : null;

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSecretCard(null);
        setActionError(null);
        setPendingRevoke(null);
      };
    }, []),
  );

  useEffect(() => {
    if (!groupId) return;
    void loadInvites(groupId).catch(() => undefined);
  }, [groupId, loadInvites]);

  const inviteItems = invites.groupId === groupId ? invites.items : [];
  const hasInvites = inviteItems.length > 0;
  const effectiveErrorCode =
    invites.errorCode ?? (online ? null : "OFFLINE");
  const showLoading =
    !hasInvites &&
    !effectiveErrorCode &&
    (invites.status === "idle" || invites.status === "loading");
  const showEmpty = !hasInvites && invites.status === "ready" && !effectiveErrorCode;
  const showBlockingError = !hasInvites && !!effectiveErrorCode;
  const showPartialError = hasInvites && !!effectiveErrorCode;
  const createPending = mutation.pending && mutation.kind === "create_invite";
  const effectiveActionErrorCode =
    actionError?.groupId === groupId ? actionError.code : mutation.errorCode;
  const actionErrorCopy = effectiveActionErrorCode
    ? resolveInviteActionErrorCopy(effectiveActionErrorCode, t)
    : null;

  const refreshInvites = useCallback(() => {
    if (!groupId) return;
    setActionError(null);
    void loadInvites(groupId).catch((error) => {
      setActionError({ groupId, code: toGroupsError(error).code });
    });
  }, [groupId, loadInvites]);

  const handleCreateInvite = useCallback(async () => {
    if (!groupId || !isOwner) return;
    setActionError(null);
    try {
      const response = await createInvite(groupId, { expiresInDays: 7, maxUses: 25 });
      setSecretCard({
        groupId,
        inviteId: response.invite.id,
        code: response.invite.code,
        link: buildInviteLink(
          response.invite.token,
          process.env.EXPO_PUBLIC_JOIN_BASE_URL,
        ),
      });
    } catch (error) {
      setActionError({ groupId, code: toGroupsError(error).code });
    }
  }, [createInvite, groupId, isOwner]);

  const handleShare = useCallback(async () => {
    if (!groupId || !visibleSecretCard) return;
    setActionError(null);
    try {
      await Share.share({
        message: t("groupInvitesShareMessage", {
          link: visibleSecretCard.link,
          code: visibleSecretCard.code,
        }),
      });
    } catch (error) {
      setActionError({ groupId, code: toGroupsError(error).code });
    }
  }, [groupId, t, visibleSecretCard]);

  const handleCopyLink = useCallback(async () => {
    if (!groupId || !visibleSecretCard) return;
    setActionError(null);
    try {
      await Clipboard.setStringAsync(visibleSecretCard.link);
    } catch (error) {
      setActionError({ groupId, code: toGroupsError(error).code });
    }
  }, [groupId, visibleSecretCard]);

  const handleCopyCode = useCallback(async () => {
    if (!groupId || !visibleSecretCard) return;
    setActionError(null);
    try {
      await Clipboard.setStringAsync(visibleSecretCard.code);
    } catch (error) {
      setActionError({ groupId, code: toGroupsError(error).code });
    }
  }, [groupId, visibleSecretCard]);

  const revokeWithRefresh = useCallback(
    async (inviteId: string) => {
      if (!groupId || !isOwner || pendingRevokeInviteId) return;
      setActionError(null);
      setPendingRevoke({ groupId, inviteId });
      try {
        await revokeInvite(groupId, inviteId);
        if (visibleSecretInviteId === inviteId) {
          setSecretCard(null);
        }
        await loadInvites(groupId);
      } catch (error) {
        setActionError({ groupId, code: toGroupsError(error).code });
      } finally {
        setPendingRevoke((current) =>
          current?.groupId === groupId && current.inviteId === inviteId
            ? null
            : current,
        );
      }
    },
    [
      groupId,
      isOwner,
      loadInvites,
      pendingRevokeInviteId,
      revokeInvite,
      visibleSecretInviteId,
    ],
  );

  const confirmRevoke = useCallback(
    (inviteId: string) => {
      Alert.alert(
        t("groupInvitesRevokeConfirmTitle"),
        t("groupInvitesRevokeConfirmBody"),
        [
          { text: t("commonCancel"), style: "cancel" },
          {
            text: t("groupInvitesRevokeAction"),
            style: "destructive",
            onPress: () => {
              void revokeWithRefresh(inviteId);
            },
          },
        ],
      );
    },
    [revokeWithRefresh, t],
  );

  const errorCopy = effectiveErrorCode
    ? resolveInviteErrorCopy(effectiveErrorCode, t)
    : null;

  const notOwner = group !== null && !isOwner;

  return (
    <AppScreen>
      <Stack.Screen options={{ title: group?.name ?? t("groupInvitesTitle") }} />
      <AppButton
        label={t("groupInvitesCreateAction")}
        disabled={!groupId || !isOwner}
        loading={createPending}
        onPress={() => {
          void handleCreateInvite();
        }}
      />
      {actionErrorCopy ? (
        <View style={{ gap: spacing.sm }}>
          <StatusBanner
            title={actionErrorCopy.title}
            body={actionErrorCopy.body}
            tone={actionErrorCopy.tone}
          />
          <AppButton
            label={t("groupInvitesRefresh")}
            variant="secondary"
            style={retryButtonStyle}
            onPress={refreshInvites}
          />
        </View>
      ) : null}
      {visibleSecretCard ? (
        <AppCard style={{ gap: spacing.sm }}>
          <AppText variant="title">{t("groupInvitesSecretTitle")}</AppText>
          <AppText variant="caption">{t("groupInvitesSecretBody")}</AppText>
          <AppText variant="caption">{t("groupInvitesSecretLinkLabel")}</AppText>
          <AppText selectable style={tabularNumberStyle}>
            {visibleSecretCard.link}
          </AppText>
          <AppText variant="caption">{t("groupInvitesSecretCodeLabel")}</AppText>
          <AppText selectable style={tabularNumberStyle}>
            {visibleSecretCard.code}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <AppButton
              label={t("groupInvitesShareAction")}
              variant="secondary"
              onPress={() => {
                void handleShare();
              }}
            />
            <AppButton
              label={t("groupInvitesCopyLinkAction")}
              variant="secondary"
              onPress={() => {
                void handleCopyLink();
              }}
            />
            <AppButton
              label={t("groupInvitesCopyCodeAction")}
              variant="secondary"
              onPress={() => {
                void handleCopyCode();
              }}
            />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <AppButton
              label={t("groupInvitesDismissSecretAction")}
              variant="ghost"
              onPress={() => setSecretCard(null)}
            />
            <AppButton
              label={t("groupInvitesRevokeAction")}
              loading={pendingRevokeInviteId === visibleSecretCard.inviteId}
              variant="destructive"
              onPress={() => confirmRevoke(visibleSecretCard.inviteId)}
            />
          </View>
        </AppCard>
      ) : null}

      {showPartialError && errorCopy ? (
        <View style={{ gap: spacing.sm }}>
          <StatusBanner
            title={t("statePartialErrorTitle")}
            body={t("statePartialErrorBody")}
            tone={errorCopy.tone}
          />
          <AppText variant="caption">{errorCopy.body}</AppText>
          <AppButton
            label={t("groupInvitesRefresh")}
            variant="secondary"
            style={retryButtonStyle}
            onPress={refreshInvites}
          />
        </View>
      ) : null}

      {notOwner ? (
        <StateCard
          title={t("stateForbiddenTitle")}
          body={t("stateForbiddenBody")}
        />
      ) : showLoading ? (
        <StateCard
          title={t("groupInvitesLoadingTitle")}
          body={t("groupInvitesLoadingBody")}
        />
      ) : showBlockingError && errorCopy ? (
        <StateCard
          title={errorCopy.title}
          body={errorCopy.body}
          actionLabel={t("groupInvitesRefresh")}
          onAction={refreshInvites}
        />
      ) : showEmpty ? (
        <AppCard>
          <AppText variant="title">{t("groupInvitesEmptyTitle")}</AppText>
          <AppText>{t("groupInvitesEmptyBody")}</AppText>
        </AppCard>
      ) : (
        inviteItems.map((invite) => (
          <AppCard key={invite.id} style={{ gap: spacing.sm }}>
            <AppText variant="bodyStrong">
              {resolveStatusLabel(invite.status, t)}
            </AppText>
            <AppText style={tabularNumberStyle}>{`${t("groupInvitesUseLabel")}: ${formatNumeric(
              invite.useCount,
              localeTag,
            )} / ${formatNumeric(invite.maxUses, localeTag)}`}</AppText>
            <AppText variant="caption" style={tabularNumberStyle}>{`${t(
              "groupInvitesExpiryLabel",
            )}: ${formatInviteTimestamp(invite.expiresAt, localeTag, timeZone)}`}</AppText>
            <AppButton
              label={t("groupInvitesRevokeAction")}
              variant="destructive"
              loading={pendingRevokeInviteId === invite.id}
              disabled={!isOwner || invite.status !== "active"}
              onPress={() => confirmRevoke(invite.id)}
            />
          </AppCard>
        ))
      )}
    </AppScreen>
  );
}
