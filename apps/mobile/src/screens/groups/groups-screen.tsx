import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  StatusBanner,
} from "@/components";
import { useGroups, type GroupListItem } from "@/lib/groups";
import {
  formatAppDate,
  formatAppNumber,
  formatAppTime,
  useTranslation,
} from "@/localization";
import { spacing } from "@/theme";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";

const tabularNumbersStyle: TextStyle = { fontVariant: ["tabular-nums"] };
const retryButtonStyle: ViewStyle = { alignSelf: "flex-start" };

function formatNumeric(value: string, localeTag: string) {
  try {
    return formatAppNumber(BigInt(value), localeTag);
  } catch {
    return value;
  }
}

function formatServerTimestamp(
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

const GroupRow = memo(function GroupRow({
  group,
  localeTag,
  onOpenGroup,
  weekLabel,
  rankLabel,
  rankUnranked,
  membersLabel,
  calculatedLabel,
  updatedLabel,
  anonymityLabel,
}: {
  group: GroupListItem;
  localeTag: string;
  onOpenGroup(groupId: string): void;
  weekLabel: string;
  rankLabel: string;
  rankUnranked: string;
  membersLabel: string;
  calculatedLabel: string;
  updatedLabel: string;
  anonymityLabel: string;
}) {
  const ownRankText =
    group.ownRank > 0
      ? formatAppNumber(group.ownRank, localeTag)
      : rankUnranked;
  const ownWeekTotalText = formatNumeric(group.ownWeekTotal, localeTag);
  const memberCountText = formatNumeric(group.memberCount, localeTag);
  const calculatedText = formatServerTimestamp(
    group.calculatedAt,
    localeTag,
    group.timezone,
  );
  const updatedText = formatServerTimestamp(group.updatedAt, localeTag, group.timezone);
  const accessibilityLabel = `${group.name}. ${weekLabel}: ${rankLabel} ${ownRankText} · ${ownWeekTotalText}. ${memberCountText} ${membersLabel}.`;
  const accessibilityHint = `${calculatedLabel}: ${calculatedText}. ${updatedLabel}: ${updatedText}. ${anonymityLabel}.`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={() => onOpenGroup(group.id)}
      style={({ pressed }) => [
        {
          minHeight: 44,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppCard style={{ minHeight: 56, gap: spacing.xs, justifyContent: "center" }}>
        <AppText variant="bodyStrong">{group.name}</AppText>
        <AppText style={tabularNumbersStyle}>{`${weekLabel}: ${rankLabel} ${ownRankText} · ${ownWeekTotalText}`}</AppText>
        <AppText style={tabularNumbersStyle}>{`${memberCountText} ${membersLabel}`}</AppText>
        <AppText variant="caption" style={tabularNumbersStyle}>{`${calculatedLabel}: ${calculatedText}`}</AppText>
        <AppText variant="caption" style={tabularNumbersStyle}>{`${updatedLabel}: ${updatedText}`}</AppText>
        <AppText variant="caption">{anonymityLabel}</AppText>
      </AppCard>
    </Pressable>
  );
});

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

export function GroupsScreen() {
  const { t, localeTag } = useTranslation();
  const { push } = useRouter();
  const { groups, online, refreshGroups } = useGroups();
  const [refreshing, setRefreshing] = useState(false);
  const weekLabel = t("groupsListWeekTotalLabel");
  const rankLabel = t("groupsListRankLabel");
  const rankUnrankedLabel = t("groupsListRankUnranked");
  const membersLabel = t("groupsListMembersLabel");
  const calculatedLabel = t("groupsListCalculatedLabel");
  const updatedLabel = t("groupsListUpdatedLabel");

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshGroups();
    } catch {
      // State is surfaced by the provider through typed status + error fields.
    } finally {
      setRefreshing(false);
    }
  }, [refreshGroups]);

  useEffect(() => {
    if (groups.status !== "idle") return;
    void refreshGroups().catch(() => undefined);
  }, [groups.status, refreshGroups]);

  const openGroup = useCallback(
    (groupId: string) => {
      push({ pathname: "/groups/[id]", params: { id: groupId } });
    },
    [push],
  );

  const hasGroups = groups.items.length > 0;
  const offlineError = groups.errorCode === "OFFLINE" || !online;
  const showLoading =
    !hasGroups && (groups.status === "idle" || groups.status === "loading");
  const showEmpty = !hasGroups && groups.status === "ready";
  const showOffline = !hasGroups && offlineError && !showEmpty;
  const showError = !hasGroups && groups.status === "error" && !offlineError;
  const showOfflineBanner = offlineError && (hasGroups || showEmpty);
  const showPartialErrorBanner = hasGroups && !offlineError && !!groups.errorCode;

  return (
    <AppScreen
      testID="groups-list-screen"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <AppButton label={t("groupsCreate")} onPress={() => push("/groups/create")} />
      {showOfflineBanner ? (
        <StatusBanner
          title={t("groupsListOfflineTitle")}
          body={t("groupsListOfflineBody")}
          tone="offline"
        />
      ) : null}
      {showPartialErrorBanner ? (
        <View style={{ gap: spacing.sm }}>
          <StatusBanner
            title={t("statePartialErrorTitle")}
            body={t("statePartialErrorBody")}
            tone="error"
          />
          <AppButton
            label={t("groupsListRefresh")}
            variant="secondary"
            style={retryButtonStyle}
            onPress={() => {
              void handleRefresh();
            }}
          />
        </View>
      ) : null}
      {showLoading ? (
        <StateCard
          title={t("groupsListLoadingTitle")}
          body={t("groupsListLoadingBody")}
        />
      ) : showOffline ? (
        <StateCard
          title={t("groupsListOfflineTitle")}
          body={t("groupsListOfflineBody")}
          actionLabel={t("groupsListRefresh")}
          onAction={() => {
            void handleRefresh();
          }}
        />
      ) : showError ? (
        <StateCard
          title={t("groupsListErrorTitle")}
          body={t("groupsListErrorBody")}
          actionLabel={t("groupsListRefresh")}
          onAction={() => {
            void handleRefresh();
          }}
        />
      ) : showEmpty ? (
        <AppCard>
          <AppText variant="title">{t("groupsEmptyTitle")}</AppText>
          <AppText>{t("groupsEmptyBody")}</AppText>
        </AppCard>
      ) : (
        <View style={{ gap: spacing.md }}>
          {groups.items.map((group) => (
            <GroupRow
              key={group.id}
              group={group}
              localeTag={localeTag}
              weekLabel={weekLabel}
              rankLabel={rankLabel}
              rankUnranked={rankUnrankedLabel}
              membersLabel={membersLabel}
              calculatedLabel={calculatedLabel}
              updatedLabel={updatedLabel}
              anonymityLabel={
                group.leaderboardAnonymous
                  ? t("groupsListAnonymousOn")
                  : t("groupsListAnonymousOff")
              }
              onOpenGroup={openGroup}
            />
          ))}
        </View>
      )}
    </AppScreen>
  );
}
