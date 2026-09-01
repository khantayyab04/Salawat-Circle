import {
  AppButton,
  AppCard,
  AppText,
  StatusBanner,
} from "@/components";
import {
  toGroupsError,
  type GroupMember,
  type GroupsErrorCode,
  useGroups,
} from "@/lib/groups";
import {
  formatAppDate,
  type TranslationKey,
  useTranslation,
} from "@/localization";
import { spacing, useAppTheme } from "@/theme";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  View,
  useWindowDimensions,
} from "react-native";

function readGroupId(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function errorCopy(
  code: GroupsErrorCode,
  t: (key: TranslationKey) => string,
) {
  switch (code) {
    case "OFFLINE":
      return { title: t("groupMembersOfflineTitle"), body: t("groupMembersOfflineBody") };
    case "NOT_FOUND":
      return { title: t("groupMembersNotFoundTitle"), body: t("groupMembersNotFoundBody") };
    case "RATE_LIMITED":
      return { title: t("groupMembersRateLimitedTitle"), body: t("groupMembersRateLimitedBody") };
    default:
      return { title: t("groupMembersErrorTitle"), body: t("groupMembersErrorBody") };
  }
}

function MemberRow({
  member,
  canManage,
  disabled,
  onRemove,
  onTransfer,
}: {
  member: GroupMember;
  canManage: boolean;
  disabled: boolean;
  onRemove(): void;
  onTransfer(): void;
}) {
  const { t, localeTag } = useTranslation();
  const { colors } = useAppTheme();
  const joinedAt = new Date(member.joinedAt);
  const joined = Number.isNaN(joinedAt.getTime())
    ? member.joinedAt
    : formatAppDate(joinedAt, localeTag, "UTC");

  return (
    <AppCard style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="bodyStrong">{member.displayName}</AppText>
          <AppText variant="caption">
            {member.role === "owner" ? t("groupMembersOwner") : t("groupMembersMember")}
            {member.isSelf ? ` · ${t("groupDetailSelfLabel")}` : ""}
          </AppText>
        </View>
        <AppText selectable variant="caption" style={{ color: colors.textSecondary }}>
          {t("groupMembersJoined", { date: joined })}
        </AppText>
      </View>
      {canManage && !member.isSelf ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <AppButton
            label={t("groupMembersTransferAction")}
            variant="secondary"
            disabled={disabled}
            onPress={onTransfer}
          />
          <AppButton
            label={t("groupMembersRemoveAction")}
            variant="secondary"
            disabled={disabled}
            onPress={onRemove}
          />
        </View>
      ) : null}
    </AppCard>
  );
}

export function GroupMembersScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const {
    groups,
    members,
    mutation,
    loadMembers,
    removeMember,
    transferGroupOwnership,
  } = useGroups();
  const groupId = readGroupId(id);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<GroupsErrorCode | null>(null);

  const group = useMemo(
    () => groups.items.find((item) => item.id === groupId) ?? members.group,
    [groupId, groups.items, members.group],
  );
  const isOwner = groups.items.find((item) => item.id === groupId)?.role === "owner";
  const isActiveGroup = members.groupId === groupId;
  const items = isActiveGroup ? members.items : [];
  const errorCode = actionError ?? (isActiveGroup ? members.errorCode : null);
  const isLoading =
    isActiveGroup &&
    items.length === 0 &&
    (members.status === "idle" || members.status === "loading") &&
    !errorCode;
  const pending = mutation.pending &&
    (mutation.kind === "remove_member" || mutation.kind === "transfer_ownership");

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setActionError(null);
    setRefreshing(true);
    try {
      await loadMembers(groupId, { mode: "reset" });
    } catch (error) {
      setActionError(toGroupsError(error).code);
    } finally {
      setRefreshing(false);
    }
  }, [groupId, loadMembers]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const confirmRemove = useCallback(
    (member: GroupMember) => {
      if (!groupId || !group || !isOwner) return;
      Alert.alert(
        t("groupMembersRemoveConfirmTitle"),
        t("groupMembersRemoveConfirmBody", { name: member.displayName }),
        [
          { text: t("commonCancel"), style: "cancel" },
          {
            text: t("groupMembersRemoveAction"),
            style: "destructive",
            onPress: () => {
              void removeMember(groupId, member.membershipId, group.revision)
                .catch((error) => setActionError(toGroupsError(error).code));
            },
          },
        ],
      );
    },
    [group, groupId, isOwner, removeMember, t],
  );

  const confirmTransfer = useCallback(
    (member: GroupMember) => {
      if (!groupId || !group || !isOwner) return;
      Alert.alert(
        t("groupMembersTransferConfirmTitle"),
        t("groupMembersTransferConfirmBody", { name: member.displayName }),
        [
          { text: t("commonCancel"), style: "cancel" },
          {
            text: t("groupMembersTransferAction"),
            style: "destructive",
            onPress: () => {
              void transferGroupOwnership(groupId, member.membershipId, group.revision)
                .catch((error) => setActionError(toGroupsError(error).code));
            },
          },
        ],
      );
    },
    [group, groupId, isOwner, t, transferGroupOwnership],
  );

  const loadMore = useCallback(() => {
    if (!groupId || !members.hasMore || pending) return;
    void loadMembers(groupId, { mode: "next" }).catch((error) => {
      setActionError(toGroupsError(error).code);
    });
  }, [groupId, loadMembers, members.hasMore, pending]);

  const copy = errorCode ? errorCopy(errorCode, t) : null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: group?.name ?? t("groupMembersTitle") }} />
      <FlatList
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
        data={items}
        keyExtractor={(member) => member.membershipId}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            canManage={isOwner}
            disabled={pending}
            onRemove={() => confirmRemove(item)}
            onTransfer={() => confirmTransfer(item)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            {group?.leaderboardAnonymous ? (
              <StatusBanner
                title={t("groupMembersAnonymousTitle")}
                body={t("groupMembersAnonymousBody")}
                tone="pending"
              />
            ) : null}
            {copy ? <StatusBanner title={copy.title} body={copy.body} tone="error" /> : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <AppCard accessibilityRole="alert">
              <AppText variant="title">{t("groupMembersLoadingTitle")}</AppText>
              <AppText>{t("groupMembersLoadingBody")}</AppText>
            </AppCard>
          ) : (
            <AppCard accessibilityRole="alert">
              <AppText variant="title">{t("groupMembersEmptyTitle")}</AppText>
              <AppText>{t("groupMembersEmptyBody")}</AppText>
            </AppCard>
          )
        }
        ListFooterComponent={
          members.hasMore ? (
            <AppButton
              label={t("groupMembersLoadMore")}
              variant="secondary"
              loading={members.status === "loading"}
              onPress={loadMore}
            />
          ) : null
        }
      />
    </View>
  );
}
