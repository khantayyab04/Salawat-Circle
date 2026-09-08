import { CalendarDateField } from "@/components/calendar-date-field";
import type { GroupCampaignSelection } from "@/lib/groups/types";
import Crown from "lucide-react-native/icons/crown";
import {
  AppButton,
  AppCard,
  AppText,
  AppSheet,
  FormField,
  GroupInsightsPanel,
  SectionLabel,
  SegmentedControl,
  StatusBanner,
  SyncNotice,
} from "@/components";
import { AppHeader } from "@/components/app-header";
import { formatRelativeTime } from "@/lib/relative-time";
import {
  GROUP_PERIODS,
  leaderboardPeriodFor,
  type GroupPeriod,
} from "@/lib/groups/periods";
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
import { radius, spacing, typography, useAppTheme } from "@/theme";
import Settings from "lucide-react-native/icons/settings";
import Users from "lucide-react-native/icons/users";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, Picker, Switch } from "@expo/ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  FlatList,
  RefreshControl,
  View,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from "react-native";

const tabularNumberStyle: TextStyle = { fontVariant: ["tabular-nums"] };
const retryButtonStyle: ViewStyle = { alignSelf: "flex-start" };
const fullWidthToggleModifiers = [
  frame({ maxWidth: 10_000, alignment: "leading" }),
];

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
    case "OWNER_MUST_TRANSFER":
      return { title: t("groupDetailLeaveAction"), body: t("groupOwnerLeaveBlocked"), tone: "error" };
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
  const displayName = row.isSelf && /^(du|you)$/i.test(row.displayName.trim()) ? selfLabel : row.displayName;
  const showSelfCaption = row.isSelf && displayName !== selfLabel;
  const accessibilityLabel = `${rankText}. ${displayName}. ${totalText}.${showSelfCaption ? ` ${selfLabel}.` : ""}`;

  return (
    <View
      testID={`group-detail-row-${row.rowId}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: row.isSelf }}
      style={{
        padding: spacing.lg,
        backgroundColor: row.isSelf ? colors.surfaceSubtle : colors.surface,
        borderColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: spacing.sm,
          justifyContent: "space-between",
        }}
      >
        <View style={{ minWidth: 32, minHeight: 32, paddingHorizontal: spacing.xs, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: row.rank <= 3 ? colors.accentMuted : colors.surfaceMuted }}>
          <AppText style={[tabularNumberStyle, { color: row.rank <= 3 ? colors.goldText : colors.textSecondary }]}>{rankText}</AppText>
        </View>
        <AppText style={{ flex: 1 }} variant="bodyStrong">
          {displayName}
        </AppText>
        <AppText style={typography.amount}>{totalText}</AppText>
      </View>
      {showSelfCaption ? <AppText variant="caption">{selfLabel}</AppText> : null}
    </View>
  );
});

export function GroupDetailScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { localeTag, t } = useTranslation();
  const { width } = useWindowDimensions();
  const { push, replace } = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const {
    groups,
    leaderboard,
    mutation,
    online,
    loadLeaderboard,
    refreshGroups,
    setAnonymity,
    setGroupGoal,
    updateGroupName,
    leaveGroup,
    deleteGroup,
    loadInsights,
    insightsByGroup,
    insightsStatusByGroup,
  } = useGroups();

  const groupId = readGroupId(id);
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [refreshing, setRefreshing] = useState(false);
  const [switchErrorMessage, setSwitchErrorMessage] = useState<string | null>(null);
  const [managementMode, setManagementMode] = useState<
    "rename" | "leave" | "delete" | null
  >(null);
  const [managementOpen, setManagementOpen] = useState(false);
  const [nextGroupName, setNextGroupName] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [campaignMode, setCampaignMode] = useState<GroupCampaignSelection["mode"]>("gregorian");
  const [campaignStart, setCampaignStart] = useState("2026-01-01");
  const [goalError, setGoalError] = useState<string | null>(null);
  const goalSubmitGuard = useRef(false);
  const loadMoreGuardRef = useRef(false);
  const periodRef = useRef<LeaderboardPeriod>(period);
  const appStateRef = useRef(AppState.currentState);

  const listGroup = useMemo<GroupListItem | null>(() => {
    if (!groupId) return null;
    return groups.items.find((group) => group.id === groupId) ?? null;
  }, [groupId, groups.items]);

  const screenPeriod: GroupPeriod = period === "all_time" ? "all" : period;
  const insights = groupId ? (insightsByGroup?.[groupId]?.[screenPeriod] ?? null) : null;
  const insightsStatus = groupId ? insightsStatusByGroup?.[groupId]?.[screenPeriod] : undefined;

  const goalPercent = useMemo(() => {
    if (!insights?.goalAmount) return null;
    const goal = Number(insights.goalAmount);
    if (!Number.isFinite(goal) || goal <= 0) return null;
    return (Number(insights.periodTotal) / goal) * 100;
  }, [insights]);

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
  const ownerLeaveBlocked = isOwner && memberCount !== "1";
  const calculatedAt = groupPeriodState.calculatedAt ?? listGroup?.calculatedAt ?? null;

  const memberCountText = formatNumeric(memberCount, localeTag);
  // The tile is small, so a full timestamp would shrink into unreadability.
  // The exact value stays available through the accessibility hint below.
  const relativeCalculated = calculatedAt
    ? formatRelativeTime(calculatedAt, new Date(), {
        justNow: t("relativeJustNow"),
        minutes: t("relativeMinutes"),
        hours: t("relativeHours"),
        days: t("relativeDays"),
      })
    : null;

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
  const managementPending =
    mutation.pending &&
    ["update_group_name", "leave_group", "delete_group"].includes(
      mutation.kind ?? "",
    );
  const goalPending = mutation.pending && mutation.kind === "set_group_goal";
  const goalAmount = /^\d+$/.test(goalInput.trim()) ? Number(goalInput.trim()) : NaN;
  const validGoal = Number.isSafeInteger(goalAmount) && goalAmount >= 1 && goalAmount <= 10_000_000;

  const saveGoal = async (amount: number | null) => {
    if (!groupId || !isOwner || typeof revision !== "number" || goalSubmitGuard.current) return;
    goalSubmitGuard.current = true;
    setGoalError(null);
    try {
      await setGroupGoal(groupId, screenPeriod, amount, revision,
        screenPeriod === "month" ? { mode: campaignMode, startDate: campaignStart } : undefined);
      setGoalEditorOpen(false);
    } catch (error) {
      const code = readErrorCode(error);
      setGoalError(resolveLeaderboardErrorCopy(code, t).body);
      if (SWITCH_ERROR_REFRESH_CODES.has(code)) {
        await loadLeaderboard(groupId, period, { mode: "reset" }).catch(() => undefined);
      }
    } finally {
      goalSubmitGuard.current = false;
    }
  };

  useEffect(() => {
    loadMoreGuardRef.current = false;
  }, [groupId, period]);

  useFocusEffect(
    useCallback(() => {
      if (!groupId) return;
      void loadLeaderboard(groupId, periodRef.current, { mode: "reset" }).catch(
        () => undefined,
      );
      void loadInsights?.(groupId, periodRef.current === "all_time" ? "all" : periodRef.current).catch(() => undefined);
    }, [groupId, loadInsights, loadLeaderboard]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState !== "active" || previousState === "active" || !groupId) return;
      void loadLeaderboard(groupId, periodRef.current, { mode: "reset" }).catch(
        () => undefined,
      );
      void loadInsights?.(groupId, periodRef.current === "all_time" ? "all" : periodRef.current).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [groupId, loadInsights, loadLeaderboard]);

  const refreshCurrentPeriod = useCallback(async () => {
    if (!groupId) return;
    setRefreshing(true);
    setSwitchErrorMessage(null);
    try {
      await Promise.all([
        refreshGroups(),
        loadLeaderboard(groupId, period, { mode: "reset" }),
        loadInsights?.(groupId, period === "all_time" ? "all" : period),
      ]);
    } catch {
      // Error state is rendered from Groups store.
    } finally {
      setRefreshing(false);
    }
  }, [groupId, loadInsights, loadLeaderboard, period, refreshGroups]);

  const switchPeriod = useCallback(
    (nextPeriod: LeaderboardPeriod) => {
      if (!groupId) return;
      setSwitchErrorMessage(null);
      periodRef.current = nextPeriod;
      setPeriod(nextPeriod);
      void loadLeaderboard(groupId, nextPeriod, { mode: "reset" }).catch(
        () => undefined,
      );
      void loadInsights?.(groupId, nextPeriod === "all_time" ? "all" : nextPeriod).catch(() => undefined);
    },
    [groupId, loadInsights, loadLeaderboard],
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

  const saveGroupName = useCallback(async () => {
    if (!groupId || !isOwner || typeof revision !== "number") return;
    try {
      await updateGroupName(groupId, nextGroupName, revision);
      setManagementMode(null);
      setNextGroupName("");
    } catch (error) {
      setSwitchErrorMessage(resolveLeaderboardErrorCopy(readErrorCode(error), t).body);
    }
  }, [groupId, isOwner, nextGroupName, revision, t, updateGroupName]);

  const confirmLeave = useCallback(async () => {
    if (!groupId || ownerLeaveBlocked) return;
    try {
      await leaveGroup(groupId);
      replace("/groups");
    } catch (error) {
      setSwitchErrorMessage(resolveLeaderboardErrorCopy(readErrorCode(error), t).body);
    }
  }, [groupId, ownerLeaveBlocked, leaveGroup, replace, t]);

  const confirmDelete = useCallback(async () => {
    if (
      !groupId ||
      !isOwner ||
      typeof revision !== "number" ||
      deleteConfirmation !== groupName
    ) {
      return;
    }
    try {
      await deleteGroup(groupId, revision);
      replace("/groups");
    } catch (error) {
      setSwitchErrorMessage(resolveLeaderboardErrorCopy(readErrorCode(error), t).body);
    }
  }, [
    deleteConfirmation,
    deleteGroup,
    groupId,
    groupName,
    isOwner,
    replace,
    revision,
    t,
  ]);

  const listHeader = (
    <View style={{ gap: spacing.lg }}>
      <Stack.Screen options={{ headerShown: false, title: groupName }} />

      {isOwner ? <View accessible accessibilityLabel={t("groupMembersOwner")} style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.accentMuted }}>
        <Crown size={16} color={colors.goldText} />
        <AppText variant="caption" style={{ color: colors.goldText }}>{t("groupMembersOwner")}</AppText>
      </View> : null}
      <SegmentedControl
        onChange={(next) => switchPeriod(leaderboardPeriodFor(next))}
        options={GROUP_PERIODS.map((value) => ({
          value,
          label: t(
            value === "week"
              ? "groupDetailWeek"
              : value === "month"
                ? "groupDetailMonth"
                : "groupDetailAllTime",
          ),
        }))}
        value={screenPeriod}
      />

      {insightsStatus?.errorCode ? (
        <SyncNotice
          body={t("groupDetailInsightsFailed")}
          title={t("statePartialErrorTitle")}
          tone="error"
        />
      ) : null}

      {insights ? <GroupInsightsPanel
        activeMembers={formatNumeric(
          insights?.activeMembers ?? memberCountText,
          localeTag,
        )}
        copy={{
          goalPrefix: t("groupDetailGoalPrefix"),
          remaining: t("groupDetailRemaining"),
          noGoal: t("groupDetailNoGoal"),
          groupPerDay: t("groupDetailGroupPerDay"),
          youPerDay: t("groupDetailYouPerDay"),
          activeMembers: t("groupDetailActiveMembersShort"),
          updated: t("groupDetailUpdatedShort"),
        }}
        goalAmount={
          insights?.goalAmount
            ? formatNumeric(insights.goalAmount, localeTag)
            : null
        }
        goalPercent={goalPercent}
        groupPerDay={
          insights?.groupPerDay
            ? formatNumeric(insights.groupPerDay, localeTag)
            : null
        }
        perPersonPerDay={
          insights?.perPersonPerDay
            ? formatNumeric(insights.perPersonPerDay, localeTag)
            : null
        }
        periodTotal={formatNumeric(insights?.periodTotal ?? "0", localeTag)}
        remaining={
          insights?.remaining
            ? formatNumeric(insights.remaining, localeTag)
            : null
        }
        totalMembers={
          insights?.totalMembers
            ? formatNumeric(insights.totalMembers, localeTag)
            : null
        }
        updatedHint={calculatedText}
        updatedLabel={relativeCalculated ?? calculatedText}
      /> : <StateCard
        title={t(insightsStatus?.errorCode ? "groupDetailErrorTitle" : "groupDetailLoadingTitle")}
        body={t(insightsStatus?.errorCode ? "groupDetailInsightsFailed" : "groupDetailLoadingBody")}
        actionLabel={insightsStatus?.errorCode ? t("groupDetailRefresh") : undefined}
        onAction={() => { if (groupId) void loadInsights(groupId, screenPeriod).catch(() => undefined); }}
      />}
      {screenPeriod === "month" && insights?.campaign ? <AppText variant="caption">{t("groupCampaignBounds", {
        start: formatAppDate(new Date(`${insights.campaign.startDate}T12:00:00Z`), localeTag, "UTC"),
        end: formatAppDate(new Date(`${insights.campaign.endDate}T12:00:00Z`), localeTag, "UTC"),
      })}</AppText> : null}
      {screenPeriod === "week" && insights?.goalSource === "campaign" ? <AppText variant="caption">{t("groupCampaignWeekly")}</AppText> : null}
      {isOwner ? <AppButton
        label={t("groupDetailGoalEdit")}
        variant="secondary"
        disabled={!online || typeof revision !== "number" || goalPending}
        onPress={() => {
          setGoalInput(insights?.goalSource === "campaign" && screenPeriod === "week" ? "" : insights?.goalAmount ?? "");
          setCampaignMode(insights?.campaign?.mode ?? "gregorian");
          setCampaignStart(insights?.campaign?.startDate ?? new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
          setGoalError(null);
          setGoalEditorOpen(true);
        }}
      /> : null}
      <View style={{ padding: spacing.lg, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
        <AppText variant="cardTitle">{t("groupDetailRankingTitle")}</AppText>
        <SectionLabel>{t(anonymityEnabled ? "groupDetailAliasOn" : "groupDetailAliasOff")}</SectionLabel>
      </View>
    </View>
  );

  // The design puts the management actions below the ranking, so they
  // live in the list footer rather than in its header.
  const listFooter = (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
        {isOwner ? <AppButton
          label={t("groupDetailInviteAction")}
          variant="secondary"
          style={{ flex: 1 }}
          icon={<Users size={18} color={colors.primary} />}
          onPress={() => { if (groupId) push({ pathname: "/groups/[id]/invites", params: { id: groupId } }); }}
        /> : null}
        <AppButton
          label={t("groupDetailSettingsAction")}
          variant="secondary"
          style={{ flex: 1 }}
          icon={<Settings size={18} color={colors.primary} />}
          onPress={() => { setManagementMode(null); setSwitchErrorMessage(null); setManagementOpen(true); }}
        />
      </View>
      <AppSheet
        visible={managementOpen}
        title={t("groupDetailSettingsAction")}
        subtitle={groupName}
        closeLabel={t("commonCancel")}
        onClose={() => setManagementOpen(false)}
        dismissible={!managementPending && !setAnonymityPending}
      >
        <AppButton
          label={t("groupMembers")}
          variant="secondary"
          onPress={() => {
            if (!groupId) return;
            setManagementOpen(false);
            push({ pathname: "/groups/[id]/members", params: { id: groupId } });
          }}
        />
        {isOwner ? (
          <>
            <AppButton
              label={t("groupDetailRenameAction")}
              variant="secondary"
              disabled={managementPending}
              onPress={() => {
                setSwitchErrorMessage(null);
                setNextGroupName(groupName);
                setManagementMode("rename");
              }}
            />
            <AppButton
              label={t("groupDetailDeleteAction")}
              variant="destructive"
              disabled={managementPending}
              onPress={() => {
                setSwitchErrorMessage(null);
                setDeleteConfirmation("");
                setManagementMode("delete");
              }}
            />
          </>
        ) : null}
        {ownerLeaveBlocked ? <AppText variant="caption">{t("groupOwnerLeaveBlocked")}</AppText> : (
          <AppButton
            label={t("groupDetailLeaveAction")}
            variant="secondary"
            disabled={managementPending}
            onPress={() => {
              setSwitchErrorMessage(null);
              setManagementMode("leave");
            }}
          />
        )}
        {managementMode === "rename" ? (
          <View style={{ gap: spacing.sm }}>
            <FormField
              label={t("groupDetailRenameLabel")}
              hint={t("groupDetailRenameHint")}
              maxLength={50}
              value={nextGroupName}
              onChangeText={setNextGroupName}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <AppButton
                label={t("commonCancel")}
                variant="secondary"
                disabled={managementPending}
                onPress={() => setManagementMode(null)}
              />
              <AppButton
                label={t("groupDetailRenameSaveAction")}
                disabled={managementPending || nextGroupName.trim().length < 2}
                loading={managementPending}
                onPress={() => void saveGroupName()}
              />
            </View>
          </View>
        ) : null}
        {managementMode === "leave" ? (
          <View style={{ gap: spacing.sm }}>
            <AppText>{t(isOwner ? "groupOwnerLeaveLast" : "groupDetailLeaveConfirmBody")}</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <AppButton
                label={t("commonCancel")}
                variant="secondary"
                disabled={managementPending}
                onPress={() => setManagementMode(null)}
              />
              <AppButton
                label={t("groupDetailLeaveConfirmAction")}
                variant="destructive"
                loading={managementPending}
                onPress={() => void confirmLeave()}
              />
            </View>
          </View>
        ) : null}
        {managementMode === "delete" ? (
          <View style={{ gap: spacing.sm }}>
            <AppText>{t("groupDetailDeleteConfirmBody")}</AppText>
            <FormField
              label={t("groupDetailDeleteLabel")}
              hint={t("groupDetailDeleteHint", { name: groupName })}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <AppButton
                label={t("commonCancel")}
                variant="secondary"
                disabled={managementPending}
                onPress={() => setManagementMode(null)}
              />
              <AppButton
                label={t("groupDetailDeleteConfirmAction")}
                variant="destructive"
                disabled={managementPending || deleteConfirmation !== groupName}
                loading={managementPending}
                onPress={() => void confirmDelete()}
              />
            </View>
          </View>
        ) : null}
        {isOwner ? (
          <>
            <Host matchContents>
              <Switch
                testID="group-detail-anonymity-switch"
                value={anonymityEnabled}
                disabled={setAnonymityPending}
                label={t("groupDetailAnonymityOwnerLabel")}
                modifiers={fullWidthToggleModifiers}
                onValueChange={handleAnonymityToggle}
              />
            </Host>
            <AppText variant="caption">{t("groupDetailAnonymityOwnerHint")}</AppText>
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
      </AppSheet>

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
      <AppHeader
        backLabel={t("commonBack")}
        onBack={() => replace("/groups")}
        subtitle={groupName}
        title={t("appName")}
      />
      <FlatList
        testID="group-detail-list"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
          paddingBottom: 120 + insets.bottom,
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
          <View style={{ gap: spacing.lg }}>
            {groupPeriodState.hasMore ? (
              <AppButton
                label={t("groupDetailLoadMore")}
                loading={groupPeriodState.loadingMore}
                onPress={() => {
                  void loadMore();
                }}
                variant="secondary"
              />
            ) : groupPeriodState.items.length > 0 ? (
              <SectionLabel>{t("groupDetailEnd")}</SectionLabel>
            ) : null}
            {listFooter}
          </View>
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
      <AppSheet
        visible={goalEditorOpen}
        title={t("groupDetailGoalEdit")}
        subtitle={t(screenPeriod === "week" ? "groupDetailWeek" : screenPeriod === "month" ? "groupDetailMonth" : "groupDetailAllTime")}
        closeLabel={t("commonCancel")}
        onClose={() => setGoalEditorOpen(false)}
        dismissible={!goalPending}
        footer={<AppButton label={t("groupDetailGoalSave")} disabled={!validGoal || !isOwner} loading={goalPending} onPress={() => void saveGoal(goalAmount)} />}
      >
        {screenPeriod === "month" ? <>
          <AppText variant="bodyStrong">{t("groupCampaignMode")}</AppText>
          <Host matchContents style={{ minHeight: 44 }}>
            <Picker testID="group-campaign-mode" selectedValue={campaignMode} onValueChange={setCampaignMode} enabled={!goalPending}>
              <Picker.Item value="gregorian" label={t("groupCampaignGregorian")} />
              <Picker.Item value="islamic" label={t("groupCampaignIslamic")} />
              <Picker.Item value="custom" label={t("groupCampaignCustom")} />
            </Picker>
          </Host>
          <CalendarDateField label={t(campaignMode === "custom" ? "groupCampaignStart" : "groupCampaignDate")} value={campaignStart} onChange={setCampaignStart} minimumDate="1900-01-01" maximumDate="2200-12-31" disabled={goalPending} />
          {campaignMode !== "custom" ? <AppText variant="caption">{t("groupCampaignHint")}</AppText> : null}
          <AppText variant="caption">{t("groupCampaignWeekly")}</AppText>
        </> : null}
        {screenPeriod === "week" ? <AppText variant="caption">{t("groupCampaignWeekly")}</AppText> : null}
        <FormField
          testID="group-goal-amount"
          label={t("groupDetailGoalAmount")}
          hint={t("groupDetailGoalHint")}
          error={goalInput.length > 0 && !validGoal ? t("groupDetailGoalInvalid") : undefined}
          keyboardType="number-pad"
          value={goalInput}
          editable={!goalPending}
          onChangeText={setGoalInput}
        />
        {goalError ? <AppText accessibilityRole="alert">{goalError}</AppText> : null}
        {insights?.goalAmount !== null && insights?.goalAmount !== undefined && insights?.goalSource !== "campaign" ? <AppButton
          label={t(screenPeriod === "week" && insights?.campaign ? "groupWeeklyOverrideClear" : "groupDetailGoalClear")}
          variant="destructive"
          disabled={goalPending || !isOwner}
          onPress={() => void saveGoal(null)}
        /> : null}
      </AppSheet>
    </View>
  );
}
