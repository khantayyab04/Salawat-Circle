import {
  AppButton,
  AppScreen,
  GroupCard,
  StateCard,
  SyncNotice,
} from "@/components";
import { AppHeader } from "@/components/app-header";
import { useGroups } from "@/lib/groups";
import {
  formatAppDate,
  formatAppNumber,
  formatAppTime,
  useTranslation,
} from "@/localization";
import { spacing } from "@/theme";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";

function formatServerTimestamp(
  value: string,
  localeTag: string,
  timeZone: string,
) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${formatAppDate(parsed, localeTag, timeZone)} ${formatAppTime(
    parsed,
    localeTag,
    timeZone,
  )}`;
}

function formatNumeric(value: string, localeTag: string) {
  try {
    return formatAppNumber(BigInt(value), localeTag);
  } catch {
    return value;
  }
}

export function GroupsScreen() {
  const { t, localeTag } = useTranslation();
  const { push } = useRouter();
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
  const showPartialErrorBanner =
    hasGroups && !offlineError && !!groups.errorCode;

  return (
    <AppScreen
      floatingTabBar
      header={
        <AppHeader subtitle={t("headerGroupsEyebrow")} title={t("appName")} />
      }
      refreshControl={
        <RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />
      }
      testID="groups-list-screen"
    >
      {showOfflineBanner ? (
        <SyncNotice
          body={t("groupsListOfflineBody")}
          title={t("groupsListOfflineTitle")}
          tone="offline"
        />
      ) : null}

      {showPartialErrorBanner ? (
        <SyncNotice
          actionLabel={t("groupsListRefresh")}
          body={t("statePartialErrorBody")}
          onAction={() => void handleRefresh()}
          title={t("statePartialErrorTitle")}
          tone="error"
        />
      ) : null}

      {showLoading ? (
        <StateCard
          body={t("groupsListLoadingBody")}
          title={t("groupsListLoadingTitle")}
        />
      ) : showOffline ? (
        <StateCard
          actionLabel={t("groupsListRefresh")}
          body={t("groupsListOfflineBody")}
          onAction={() => void handleRefresh()}
          title={t("groupsListOfflineTitle")}
        />
      ) : showError ? (
        <StateCard
          actionLabel={t("groupsListRefresh")}
          body={t("groupsListErrorBody")}
          onAction={() => void handleRefresh()}
          title={t("groupsListErrorTitle")}
        />
      ) : showEmpty ? (
        <StateCard body={t("groupsEmptyBody")} title={t("groupsEmptyTitle")} />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {groups.items.map((group) => (
            <GroupCard
              contribution={formatNumeric(group.ownWeekTotal, localeTag)}
              contributionLabel={t("groupsListWeekTotalLabel")}
              key={group.id}
              membersLabel={`${formatNumeric(group.memberCount, localeTag)} ${t(
                "groupsListMembersLabel",
              )}`}
              name={group.name}
              anonymityLabel={
                group.leaderboardAnonymous
                  ? t("groupsListAnonymousOn")
                  : t("groupsListAnonymousOff")
              }
              detailsLabel={`${t("groupsListCalculatedLabel")}: ${formatServerTimestamp(
                group.calculatedAt,
                localeTag,
                group.timezone,
              )} · ${t("groupsListUpdatedLabel")}: ${formatServerTimestamp(
                group.updatedAt,
                localeTag,
                group.timezone,
              )}`}
              onPress={() => openGroup(group.id)}
              openLabel={`${group.name}: ${t("groupsListRankLabel")} ${
                group.ownRank > 0
                  ? group.ownRank
                  : t("groupsListRankUnranked")
              } · ${formatNumeric(group.ownWeekTotal, localeTag)} · ${formatNumeric(
                group.memberCount,
                localeTag,
              )} ${t("groupsListMembersLabel")}`}
              rankLabel={group.ownRank > 0 ? `#${group.ownRank}` : null}
            />
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <AppButton
          label={t("groupsCreate")}
          onPress={() => push("/groups/create")}
          style={{ flex: 1 }}
        />
        <AppButton
          label={t("groupsJoinManualCode")}
          onPress={() => push("/join")}
          style={{ flex: 1 }}
          variant="secondary"
        />
      </View>
    </AppScreen>
  );
}
