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
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, type TextStyle, View } from "react-native";

const tabularNumbersStyle: TextStyle = { fontVariant: ["tabular-nums"] };

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

function GroupRow({
  group,
  localeTag,
  onPress,
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
  onPress(): void;
  weekLabel: string;
  rankLabel: string;
  rankUnranked: string;
  membersLabel: string;
  calculatedLabel: string;
  updatedLabel: string;
  anonymityLabel: string;
}) {
  const ownRank =
    group.ownRank > 0
      ? formatAppNumber(group.ownRank, localeTag)
      : rankUnranked;
  const ownWeekTotal = formatNumeric(group.ownWeekTotal, localeTag);
  const memberCount = formatNumeric(group.memberCount, localeTag);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={group.name}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppCard style={{ minHeight: 56, gap: spacing.xs, justifyContent: "center" }}>
        <AppText variant="bodyStrong">{group.name}</AppText>
        <AppText style={tabularNumbersStyle}>{`${weekLabel}: ${rankLabel} ${ownRank} · ${ownWeekTotal}`}</AppText>
        <AppText style={tabularNumbersStyle}>{`${memberCount} ${membersLabel}`}</AppText>
        <AppText variant="caption" style={tabularNumbersStyle}>{`${calculatedLabel}: ${formatServerTimestamp(
          group.calculatedAt,
          localeTag,
          group.timezone,
        )}`}</AppText>
        <AppText variant="caption" style={tabularNumbersStyle}>{`${updatedLabel}: ${formatServerTimestamp(
          group.updatedAt,
          localeTag,
          group.timezone,
        )}`}</AppText>
        <AppText variant="caption">{anonymityLabel}</AppText>
      </AppCard>
    </Pressable>
  );
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
    <AppCard
      accessible
      accessibilityRole="alert"
      style={{ alignItems: "flex-start", justifyContent: "center", minHeight: 160 }}
    >
      <AppText variant="title">{title}</AppText>
      <AppText>{body}</AppText>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </AppCard>
  );
}

export function GroupsScreen() {
  const { t, localeTag } = useTranslation();
  const router = useRouter();
  const { groups, online, refreshGroups } = useGroups();
  const [refreshing, setRefreshing] = useState(false);

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

  const hasGroups = groups.items.length > 0;
  const offlineError = groups.errorCode === "OFFLINE" || !online;
  const showLoading =
    !hasGroups && (groups.status === "idle" || groups.status === "loading");
  const showOffline = !hasGroups && offlineError;
  const showError = !hasGroups && groups.status === "error" && !offlineError;
  const showEmpty = !hasGroups && groups.status === "ready";
  const showOfflineBanner = hasGroups && offlineError;

  return (
    <AppScreen
      testID="groups-list-screen"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <AppButton label={t("groupsCreate")} onPress={() => router.push("/groups/create")} />
      {showOfflineBanner ? (
        <StatusBanner
          title={t("groupsListOfflineTitle")}
          body={t("groupsListOfflineBody")}
          tone="offline"
        />
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
              weekLabel={t("groupsListWeekTotalLabel")}
              rankLabel={t("groupsListRankLabel")}
              rankUnranked={t("groupsListRankUnranked")}
              membersLabel={t("groupsListMembersLabel")}
              calculatedLabel={t("groupsListCalculatedLabel")}
              updatedLabel={t("groupsListUpdatedLabel")}
              anonymityLabel={
                group.leaderboardAnonymous
                  ? t("groupsListAnonymousOn")
                  : t("groupsListAnonymousOff")
              }
              onPress={() =>
                router.push({ pathname: "/groups/[id]", params: { id: group.id } })
              }
            />
          ))}
        </View>
      )}
    </AppScreen>
  );
}
