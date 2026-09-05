import { space } from "@/design-system";
import { useGroups, type GroupListItem } from "@/lib/groups";
import {
  formatAppDate,
  formatAppNumber,
  formatAppTime,
  useTranslation,
} from "@/localization";
import { useAppTheme } from "@/theme";
import { Banner, Button, Screen, Text } from "@/ui";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";

function formatNumeric(value: string, localeTag: string) {
  try {
    return formatAppNumber(BigInt(value), localeTag);
  } catch {
    return value;
  }
}

function formatTimestamp(value: string, localeTag: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${formatAppDate(date, localeTag, timeZone)} ${formatAppTime(
    date,
    localeTag,
    timeZone,
  )}`;
}

const GroupRow = memo(function GroupRow({
  group,
  onOpen,
}: {
  group: GroupListItem;
  onOpen: (id: string) => void;
}) {
  const { t, localeTag } = useTranslation();
  const { colors } = useAppTheme();
  const rank =
    group.ownRank > 0
      ? formatAppNumber(group.ownRank, localeTag)
      : t("groupsListRankUnranked");
  const total = formatNumeric(group.ownWeekTotal, localeTag);
  const members = formatNumeric(group.memberCount, localeTag);
  const calculated = formatTimestamp(group.calculatedAt, localeTag, group.timezone);
  const updated = formatTimestamp(group.updatedAt, localeTag, group.timezone);
  const anonymity = group.leaderboardAnonymous
    ? t("groupsListAnonymousOn")
    : t("groupsListAnonymousOff");
  return (
    <Pressable
      accessibilityHint={`${t("groupsListCalculatedLabel")}: ${calculated}. ${t("groupsListUpdatedLabel")}: ${updated}. ${anonymity}.`}
      accessibilityLabel={`${group.name}. ${t("groupsListRankLabel")} ${rank}. ${total}. ${members} ${t("groupsListMembersLabel")}.`}
      accessibilityRole="button"
      onPress={() => onOpen(group.id)}
      style={({ pressed }) => ({
        minHeight: 72,
        paddingVertical: space.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View style={{ flex: 1, gap: space.xs }}>
        <Text variant="headline">{group.name}</Text>
        <Text variant="secondary">{`${t("groupsListWeekTotalLabel")}: ${t("groupsListRankLabel")} ${rank} · ${total}`}</Text>
        <Text variant="caption">{`${members} ${t("groupsListMembersLabel")}`}</Text>
        <Text variant="caption">{`${t("groupsListCalculatedLabel")}: ${calculated}`}</Text>
        <Text variant="caption">{`${t("groupsListUpdatedLabel")}: ${updated}`}</Text>
        <Text variant="caption">{anonymity}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: space.xs }}>
        <Text variant="caption">{t("groupsListRankLabel")}</Text>
        <Text variant="headline" style={{ fontVariant: ["tabular-nums"] }}>
          {rank}
        </Text>
      </View>
    </Pressable>
  );
});

function StatePanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityRole="alert"
      style={{ gap: space.md, paddingVertical: space.page }}
    >
      <Text variant="title">{title}</Text>
      <Text variant="secondary">{body}</Text>
      {action ? (
        <Button label={t("groupsListRefresh")} onPress={action} variant="secondary" />
      ) : null}
    </View>
  );
}

export function GroupsScreen() {
  const { t } = useTranslation();
  const { push } = useRouter();
  const { groups, online, refreshGroups } = useGroups();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshGroups();
    } finally {
      setRefreshing(false);
    }
  }, [refreshGroups]);

  useEffect(() => {
    if (groups.status === "idle") void refreshGroups().catch(() => undefined);
  }, [groups.status, refreshGroups]);

  const hasGroups = groups.items.length > 0;
  const offline = groups.errorCode === "OFFLINE" || !online;
  const loading = !hasGroups && (groups.status === "idle" || groups.status === "loading");
  const empty = !hasGroups && groups.status === "ready";
  const error = !hasGroups && groups.status === "error";
  const openGroup = useCallback(
    (id: string) => push({ pathname: "/groups/[id]", params: { id } }),
    [push],
  );

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      testID="groups-list-screen"
    >
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button
          label={t("groupsCreate")}
          onPress={() => push("/groups/create")}
          style={{ flex: 1 }}
        />
        <Button
          label={t("groupsJoinManualCode")}
          onPress={() => push("/join")}
          style={{ flex: 1 }}
          variant="secondary"
        />
      </View>
      {offline && hasGroups ? (
        <Banner body={t("groupsListOfflineBody")} title={t("groupsListOfflineTitle")} />
      ) : null}
      {groups.errorCode && hasGroups && !offline ? (
        <View style={{ gap: space.sm }}>
          <Banner
            body={t("statePartialErrorBody")}
            title={t("statePartialErrorTitle")}
            tone="error"
          />
          <Button
            label={t("groupsListRefresh")}
            onPress={() => void refresh()}
            variant="secondary"
          />
        </View>
      ) : null}
      {loading ? (
        <StatePanel
          body={t("groupsListLoadingBody")}
          title={t("groupsListLoadingTitle")}
        />
      ) : error && offline ? (
        <StatePanel
          action={() => void refresh()}
          body={t("groupsListOfflineBody")}
          title={t("groupsListOfflineTitle")}
        />
      ) : error ? (
        <StatePanel
          action={() => void refresh()}
          body={t("groupsListErrorBody")}
          title={t("groupsListErrorTitle")}
        />
      ) : empty ? (
        <View style={{ gap: space.sm, paddingVertical: space.page }}>
          {offline ? (
            <Banner body={t("groupsListOfflineBody")} title={t("groupsListOfflineTitle")} />
          ) : null}
          <Text variant="title">{t("groupsEmptyTitle")}</Text>
          <Text variant="secondary">{t("groupsEmptyBody")}</Text>
        </View>
      ) : (
        <View>
          {groups.items.map((group) => (
            <GroupRow key={group.id} group={group} onOpen={openGroup} />
          ))}
        </View>
      )}
    </Screen>
  );
}
