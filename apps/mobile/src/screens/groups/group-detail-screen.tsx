import {
  AppButton,
  AppCard,
  AppText,
  StatusBanner,
} from "@/components";
import {
  useGroups,
  type GroupsLeaderboardPeriodState,
  type GroupLeaderboardRow,
  type GroupListItem,
  type LeaderboardPeriod,
} from "@/lib/groups";
import {
  formatAppDate,
  formatAppNumber,
  formatAppTime,
  type TranslationKey,
  useTranslation,
} from "@/localization";
import { radius, spacing, useAppTheme } from "@/theme";
import { Host, Switch } from "@expo/ui";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from "react-native";

const tabularNumberStyle: TextStyle = { fontVariant: ["tabular-nums"] };
const retryButtonStyle: ViewStyle = { alignSelf: "flex-start" };

type LeaderboardErrorCopy = {
  title: string;
  body: string;
  tone: "offline" | "error";
};

const SWITCH_ERROR_REFRESH_CODES = new Set(["ENTRY_VERSION_CONFLICT", "CONFLICT"]);

function readGroupId(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

function readErrorCode(error: unknown): string {
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

function formatNumeric(value: string, localeTag: string) {
  try {
    return formatAppNumber(BigInt(value), localeTag);
  } catch {
    return value;
  }
}

function formatTimestamp(
  value: string | null,
  localeTag: string,
  timeZone: string,
  emptyLabel: string,
) {
  if (!value) {
    return emptyLabel;
  }

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

function getFallbackPeriodState(period: LeaderboardPeriod): GroupsLeaderboardPeriodState {
  return {
    period,
    loading: false,
    loadingMore: false,
    errorCode: null,
    items: [],
    nextCursor: null,
    hasMore: false,
    calculatedAt: null,
    group: null,
    ownAlias: null,
    ownRank: null,
    periodStart: null,
    periodEnd: null,
  };
}

function resolveLeaderboardErrorCopy(
  code: string,
  t: (key: TranslationKey) => string,
): LeaderboardErrorCopy {
  switch (code) {
    case "OFFLINE":
      return {
        title: t("groupDetailOfflineTitle"),
        body: t("groupDetailOfflineBody"),
        tone: "offline",
      };
    case "RATE_LIMITED":
      return {
        title: t("groupDetailRateLimitedTitle"),
        body: t("groupDetailRateLimitedBody"),
        tone: "error",
      };
    case "NOT_FOUND":
      return {
        title: t("groupDetailNotFoundTitle"),
        body: t("groupDetailNotFoundBody"),
        tone: "error",
      };
    case "ENTRY_VERSION_CONFLICT":
    case "CONFLICT":
      return {
        title: t("groupDetailConflictTitle"),
        body: t("groupDetailConflictBody"),
        tone: "error",
      };
    default:
      return {
        title: t("groupDetailErrorTitle"),
        body: t("groupDetailErrorBody"),
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

const PeriodButton = memo(function PeriodButton({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        minWidth: 44,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        borderCurve: "continuous",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: selected ? colors.accentMuted : colors.surface,
        borderColor: selected ? colors.accent : colors.borderSubtle,
        borderWidth: 1,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <AppText variant={selected ? "bodyStrong" : "body"}>{label}</AppText>
    </Pressable>
  );
});

const LeaderboardRow = memo(function LeaderboardRow({
  row,
  localeTag,
  selfLabel,
}: {
  row: GroupLeaderboardRow;
  localeTag: string;
  selfLabel: string;
}) {
  const { colors } = useAppTheme();
  const totalText = formatNumeric(row.total, localeTag);
  const rankText = formatAppNumber(row.rank, localeTag);
  const accessibilityLabel = `${rankText}. ${row.displayName}. ${totalText}.${
    row.isSelf ? ` ${selfLabel}.` : ""
  }`;

  return (
    <AppCard
      testID={`group-detail-row-${row.rowId}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: row.isSelf }}
      style={
        row.isSelf
          ? {
              borderColor: colors.accent,
              backgroundColor: colors.accentMuted,
            }
          : undefined
      }
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: spacing.sm,
          justifyContent: "space-between",
        }}
      >
        <AppText style={[tabularNumberStyle, { minWidth: 32 }]}>{rankText}</AppText>
        <AppText style={{ flex: 1 }} variant="bodyStrong">
          {row.displayName}
        </AppText>
        <AppText style={tabularNumberStyle}>{totalText}</AppText>
      </View>
      {row.isSelf ? <AppText variant="caption">{selfLabel}</AppText> : null}
    </AppCard>
  );
});

export function GroupDetailScreen() {
  const { colors } = useAppTheme();
  const { localeTag, t } = useTranslation();
  const { width } = useWindowDimensions();
  const { push } = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const {
    groups,
    leaderboard,
    mutation,
    online,
    loadLeaderboard,
    refreshGroups,
    setAnonymity,
  } = useGroups();

  const groupId = readGroupId(id);
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [refreshing, setRefreshing] = useState(false);
  const [switchErrorMessage, setSwitchErrorMessage] = useState<string | null>(null);
  const loadMoreGuardRef = useRef(false);

  const listGroup = useMemo<GroupListItem | null>(() => {
    if (!groupId) return null;
    return groups.items.find((group) => group.id === groupId) ?? null;
  }, [groupId, groups.items]);

  const fallbackPeriodState = useMemo(() => getFallbackPeriodState(period), [period]);
  const groupPeriodState: GroupsLeaderboardPeriodState =
    groupId && leaderboard.byGroup[groupId]
      ? leaderboard.byGroup[groupId][period]
      : fallbackPeriodState;

  const groupMeta = groupPeriodState.group;
  const timeZone = groupMeta?.timezone ?? listGroup?.timezone ?? "UTC";
  const memberCount = groupMeta?.memberCount ?? listGroup?.memberCount ?? "0";
  const revision = groupMeta?.revision ?? listGroup?.revision;
  const anonymityEnabled =
    groupMeta?.leaderboardAnonymous ?? listGroup?.leaderboardAnonymous ?? false;
  const isOwner = groupMeta?.isOwner ?? listGroup?.role === "owner";
  const calculatedAt = groupPeriodState.calculatedAt ?? listGroup?.calculatedAt ?? null;

  const memberCountText = formatNumeric(memberCount, localeTag);
  const calculatedText = formatTimestamp(
    calculatedAt,
    localeTag,
    timeZone,
    t("groupDetailCalculatedUnknown"),
  );

  const effectiveErrorCode =
    !groupId
      ? "NOT_FOUND"
      : groupPeriodState.errorCode ?? (online ? null : "OFFLINE");
  const groupName =
    groupMeta?.name ??
    listGroup?.name ??
    t(
      effectiveErrorCode === "NOT_FOUND"
        ? "groupDetailNotFoundTitle"
        : "groupDetailTitle",
    );
  const hasRows = groupPeriodState.items.length > 0;
  const showLoading = !hasRows && groupPeriodState.loading && !effectiveErrorCode;
  const showBlockingError = !hasRows && !!effectiveErrorCode;
  const showEmpty = !hasRows && !groupPeriodState.loading && !effectiveErrorCode;
  const showPartialError = hasRows && !!effectiveErrorCode;

  const resolvedErrorCopy = effectiveErrorCode
    ? resolveLeaderboardErrorCopy(effectiveErrorCode, t)
    : null;

  const setAnonymityPending = mutation.pending && mutation.kind === "set_anonymity";

  useEffect(() => {
    loadMoreGuardRef.current = false;
  }, [groupId, period]);

  useEffect(() => {
    if (!groupId) return;
    void loadLeaderboard(groupId, "week", { mode: "reset" }).catch(() => undefined);
  }, [groupId, loadLeaderboard]);

  const refreshCurrentPeriod = useCallback(async () => {
    if (!groupId) return;
    setRefreshing(true);
    setSwitchErrorMessage(null);
    try {
      await refreshGroups();
      await loadLeaderboard(groupId, period, { mode: "reset" });
    } catch {
      // Error state is rendered from Groups store.
    } finally {
      setRefreshing(false);
    }
  }, [groupId, loadLeaderboard, period, refreshGroups]);

  const switchPeriod = useCallback(
    (nextPeriod: LeaderboardPeriod) => {
      if (!groupId) return;
      setSwitchErrorMessage(null);
      setPeriod(nextPeriod);
      void loadLeaderboard(groupId, nextPeriod, { mode: "reset" }).catch(
        () => undefined,
      );
    },
    [groupId, loadLeaderboard],
  );

  const loadMore = useCallback(async () => {
    if (!groupId || loadMoreGuardRef.current) return;
    if (
      !groupPeriodState.hasMore ||
      groupPeriodState.loading ||
      groupPeriodState.loadingMore
    ) {
      return;
    }

    loadMoreGuardRef.current = true;
    try {
      await loadLeaderboard(groupId, period, { mode: "next" });
    } catch {
      // Partial error is surfaced through state.
    } finally {
      loadMoreGuardRef.current = false;
    }
  }, [
    groupId,
    groupPeriodState.hasMore,
    groupPeriodState.loading,
    groupPeriodState.loadingMore,
    loadLeaderboard,
    period,
  ]);

  const handleAnonymityToggle = useCallback(
    async (value: boolean) => {
      if (!groupId || !isOwner) return;
      if (typeof revision !== "number") {
        setSwitchErrorMessage(t("groupDetailAnonymityRevisionMissing"));
        return;
      }

      setSwitchErrorMessage(null);
      try {
        await setAnonymity(groupId, value, revision);
      } catch (error) {
        const code = readErrorCode(error);
        if (SWITCH_ERROR_REFRESH_CODES.has(code)) {
          setSwitchErrorMessage(t("groupDetailAnonymityConflict"));
          await loadLeaderboard(groupId, period, { mode: "reset" }).catch(
            () => undefined,
          );
          return;
        }

        const fallback = resolveLeaderboardErrorCopy(code, t);
        setSwitchErrorMessage(fallback.body);
      }
    },
    [groupId, isOwner, loadLeaderboard, period, revision, setAnonymity, t],
  );

  const listHeader = (
    <View style={{ gap: spacing.lg }}>
      <Stack.Screen options={{ title: groupName }} />
      <AppCard>
        <AppText variant="bodyStrong">{groupName}</AppText>
        <AppText style={tabularNumberStyle}>{`${memberCountText} ${t(
          "groupDetailMembersLabel",
        )}`}</AppText>
        <AppText variant="caption" style={tabularNumberStyle}>{`${t(
          "groupDetailCalculatedLabel",
        )}: ${calculatedText}`}</AppText>
      </AppCard>

      <AppCard style={{ gap: spacing.sm }}>
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: "row",
            gap: spacing.sm,
          }}
        >
          <PeriodButton
            testID="group-detail-period-week"
            label={t("groupDetailWeek")}
            selected={period === "week"}
            onPress={() => switchPeriod("week")}
          />
          <PeriodButton
            testID="group-detail-period-all-time"
            label={t("groupDetailAllTime")}
            selected={period === "all_time"}
            onPress={() => switchPeriod("all_time")}
          />
        </View>
      </AppCard>

      <AppCard style={{ gap: spacing.sm }}>
        {isOwner ? (
          <>
            <Host matchContents>
              <Switch
                testID="group-detail-anonymity-switch"
                value={anonymityEnabled}
                disabled={setAnonymityPending}
                label={t("groupDetailAnonymityOwnerLabel")}
                onValueChange={handleAnonymityToggle}
              />
            </Host>
            <AppText variant="caption">{t("groupDetailAnonymityOwnerHint")}</AppText>
            <AppButton
              label={t("groupDetailInviteAction")}
              variant="secondary"
              onPress={() =>
                push({ pathname: "/groups/[id]/invites", params: { id: groupId } })
              }
            />
          </>
        ) : (
          <AppText>
            {anonymityEnabled
              ? t("groupDetailAnonymityMemberStatusOn")
              : t("groupDetailAnonymityMemberStatusOff")}
          </AppText>
        )}
        {anonymityEnabled && groupPeriodState.ownAlias ? (
          <>
            <AppText variant="caption">{`${t(
              "groupDetailAnonymityAliasPrefix",
            )}: ${groupPeriodState.ownAlias}`}</AppText>
            <AppText variant="caption">{t("groupDetailAnonymityCaveat")}</AppText>
          </>
        ) : null}
        {switchErrorMessage ? (
          <AppText accessibilityLiveRegion="polite">{switchErrorMessage}</AppText>
        ) : null}
      </AppCard>

      {showPartialError && resolvedErrorCopy ? (
        <View style={{ gap: spacing.sm }}>
          <StatusBanner
            title={t("statePartialErrorTitle")}
            body={t("statePartialErrorBody")}
            tone={resolvedErrorCopy.tone}
          />
          <AppText variant="caption">{resolvedErrorCopy.body}</AppText>
          <AppButton
            label={t("groupDetailRefresh")}
            variant="secondary"
            style={retryButtonStyle}
            onPress={() => {
              void refreshCurrentPeriod();
            }}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        testID="group-detail-list"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
          width: "100%",
          maxWidth: width > 760 ? 720 : undefined,
          alignSelf: "center",
        }}
        data={showLoading || showBlockingError || showEmpty ? [] : groupPeriodState.items}
        keyExtractor={(row) => row.rowId}
        ListEmptyComponent={
          showLoading ? (
            <StateCard
              title={t("groupDetailLoadingTitle")}
              body={t("groupDetailLoadingBody")}
            />
          ) : showBlockingError && resolvedErrorCopy ? (
            <StateCard
              title={resolvedErrorCopy.title}
              body={resolvedErrorCopy.body}
              actionLabel={t("groupDetailRefresh")}
              onAction={() => {
                void refreshCurrentPeriod();
              }}
            />
          ) : showEmpty ? (
            <AppCard>
              <AppText variant="title">{t("groupDetailEmptyTitle")}</AppText>
              <AppText>{t("groupDetailEmptyBody")}</AppText>
            </AppCard>
          ) : null
        }
        ListFooterComponent={
          groupPeriodState.hasMore ? (
            <AppButton
              label={t("groupDetailLoadMore")}
              loading={groupPeriodState.loadingMore}
              variant="secondary"
              onPress={() => {
                void loadMore();
              }}
            />
          ) : groupPeriodState.items.length > 0 ? (
            <AppText variant="caption">{t("groupDetailEnd")}</AppText>
          ) : null
        }
        ListHeaderComponent={listHeader}
        onEndReached={() => {
          void loadMore();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshCurrentPeriod} />
        }
        renderItem={({ item }) => (
          <LeaderboardRow row={item} localeTag={localeTag} selfLabel={t("groupDetailSelfLabel")} />
        )}
        style={{ backgroundColor: colors.background }}
      />
    </View>
  );
}
