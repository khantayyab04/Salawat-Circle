import { randomUUID } from "expo-crypto";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { getSupabaseClient } from "@/lib/auth/supabase-client";
import {
  GroupsController,
  type LoadLeaderboardOptions,
  type LoadMembersOptions,
} from "./groups-controller";
import type { GroupsGateway } from "./groups-gateway";
import { createSupabaseGroupsGateway } from "./groups-gateway";
import { GroupsStore } from "./groups-store";
import type {
  AcceptInviteResponse,
  AppLocale,
  CreateGroupResponse,
  CreateInviteOptions,
  CreateInviteResponse,
  DeleteGroupResponse,
  InviteKind,
  LeaveGroupResponse,
  LeaderboardPeriod,
  RemoveGroupMemberResponse,
  RevokeInviteResponse,
  SetLeaderboardAnonymityResponse,
  TransferGroupOwnershipResponse,
  UpdateGroupNameResponse,
} from "./types";

type GroupsContextValue = ReturnType<GroupsStore["getSnapshot"]> & {
  revision: number;
  refreshGroups(): Promise<void>;
  createGroup(
    name: string,
    timezone: string,
    leaderboardAnonymous: boolean,
    rulesAccepted: boolean,
  ): Promise<CreateGroupResponse>;
  loadLeaderboard(
    groupId: string,
    period: LeaderboardPeriod,
    options?: LoadLeaderboardOptions,
  ): Promise<void>;
  setAnonymity(
    groupId: string,
    anonymous: boolean,
    expectedRevision?: number,
  ): Promise<SetLeaderboardAnonymityResponse>;
  loadInvites(groupId: string): Promise<void>;
  loadMembers(
    groupId: string,
    options?: LoadMembersOptions,
  ): Promise<void>;
  createInvite(
    groupId: string,
    options?: CreateInviteOptions,
  ): Promise<CreateInviteResponse>;
  revokeInvite(groupId: string, inviteId: string): Promise<RevokeInviteResponse>;
  previewInvite(kind: InviteKind, secret: string): Promise<void>;
  acceptInvite(
    kind: InviteKind,
    secret: string,
    locale: AppLocale,
  ): Promise<AcceptInviteResponse>;
  updateGroupName(
    groupId: string,
    name: string,
    expectedRevision?: number,
  ): Promise<UpdateGroupNameResponse>;
  removeMember(
    groupId: string,
    membershipId: string,
    expectedRevision?: number,
  ): Promise<RemoveGroupMemberResponse>;
  leaveGroup(groupId: string): Promise<LeaveGroupResponse>;
  transferGroupOwnership(
    groupId: string,
    membershipId: string,
    expectedRevision?: number,
  ): Promise<TransferGroupOwnershipResponse>;
  deleteGroup(
    groupId: string,
    expectedRevision?: number,
  ): Promise<DeleteGroupResponse>;
};

const GroupsContext = createContext<GroupsContextValue | null>(null);

type NetworkStateSnapshot = {
  isConnected?: boolean;
  isInternetReachable?: boolean;
};

function isNetworkStateOnline(state: NetworkStateSnapshot) {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

async function defaultOnlineCheck() {
  try {
    return isNetworkStateOnline(await getNetworkStateAsync());
  } catch {
    return false;
  }
}

function unavailableGateway(): GroupsGateway {
  const unavailable = async () => {
    throw new Error("INTERNAL");
  };
  return {
    listMyGroups: unavailable,
    createGroup: unavailable,
    getLeaderboard: unavailable,
    setLeaderboardAnonymity: unavailable,
    createInvite: unavailable,
    listInvites: unavailable,
    revokeInvite: unavailable,
    previewInvite: unavailable,
    acceptInvite: unavailable,
    listGroupMembers: unavailable,
    updateGroupName: unavailable,
    removeGroupMember: unavailable,
    leaveGroup: unavailable,
    transferGroupOwnership: unavailable,
    deleteGroup: unavailable,
  };
}

function defaultGateway() {
  try {
    return createSupabaseGroupsGateway(getSupabaseClient());
  } catch {
    return unavailableGateway();
  }
}

export function GroupsProvider({
  children,
  accountId,
  enabled = true,
  gateway: providedGateway,
  onlineCheck,
  createId = randomUUID,
}: PropsWithChildren<{
  accountId?: string | null;
  enabled?: boolean;
  gateway?: GroupsGateway;
  onlineCheck?: () => Promise<boolean>;
  createId?: () => string;
}>) {
  const gateway = useMemo(
    () => providedGateway ?? defaultGateway(),
    [providedGateway],
  );
  const store = useMemo(
    () => new GroupsStore(accountId ?? null),
    [accountId],
  );
  const controller = useMemo(
    () =>
      new GroupsController(store, gateway, {
        createId,
        isOnline: onlineCheck ?? defaultOnlineCheck,
      }),
    [createId, gateway, onlineCheck, store],
  );

  const revision = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getVersion(),
  );
  const snapshot = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getSnapshot(),
  );

  useEffect(() => {
    if (onlineCheck) return;
    let active = true;
    let removeListener: (() => void) | undefined;
    const apply = (state: NetworkStateSnapshot) => {
      if (!active) return;
      controller.setOnline(isNetworkStateOnline(state));
    };
    void getNetworkStateAsync()
      .then((initialState) => {
        if (!active) return;
        apply(initialState);
        const subscription = addNetworkStateListener(apply);
        if (!active) {
          subscription.remove();
          return;
        }
        removeListener = () => subscription.remove();
      })
      .catch(() => {
        if (active) {
          controller.setOnline(false);
        }
      });
    return () => {
      active = false;
      removeListener?.();
    };
  }, [controller, onlineCheck]);

  useLayoutEffect(() => {
    if (!enabled || !accountId) {
      controller.reset();
      return;
    }
    void controller.initialize(accountId).catch(() => undefined);
  }, [accountId, controller, enabled]);

  const refreshGroups = useCallback(() => controller.refreshGroups(), [controller]);
  const createGroup = useCallback(
    (
      name: string,
      timezone: string,
      leaderboardAnonymous: boolean,
      rulesAccepted: boolean,
    ) => controller.createGroup(name, timezone, leaderboardAnonymous, rulesAccepted),
    [controller],
  );
  const loadLeaderboard = useCallback(
    (
      groupId: string,
      period: LeaderboardPeriod,
      options?: LoadLeaderboardOptions,
    ) => controller.loadLeaderboard(groupId, period, options),
    [controller],
  );
  const setAnonymity = useCallback(
    (groupId: string, anonymous: boolean, expectedRevision?: number) =>
      controller.setAnonymity(groupId, anonymous, expectedRevision),
    [controller],
  );
  const loadInvites = useCallback(
    (groupId: string) => controller.loadInvites(groupId),
    [controller],
  );
  const loadMembers = useCallback(
    (groupId: string, options?: LoadMembersOptions) =>
      controller.loadMembers(groupId, options),
    [controller],
  );
  const createInvite = useCallback(
    (groupId: string, options?: CreateInviteOptions) =>
      controller.createInvite(groupId, options),
    [controller],
  );
  const revokeInvite = useCallback(
    (groupId: string, inviteId: string) => controller.revokeInvite(groupId, inviteId),
    [controller],
  );
  const previewInvite = useCallback(
    (kind: InviteKind, secret: string) => controller.previewInvite(kind, secret),
    [controller],
  );
  const acceptInvite = useCallback(
    (kind: InviteKind, secret: string, locale: AppLocale) =>
      controller.acceptInvite(kind, secret, locale),
    [controller],
  );
  const updateGroupName = useCallback(
    (groupId: string, name: string, expectedRevision?: number) =>
      controller.updateGroupName(groupId, name, expectedRevision),
    [controller],
  );
  const removeMember = useCallback(
    (groupId: string, membershipId: string, expectedRevision?: number) =>
      controller.removeMember(groupId, membershipId, expectedRevision),
    [controller],
  );
  const leaveGroup = useCallback(
    (groupId: string) => controller.leaveGroup(groupId),
    [controller],
  );
  const transferGroupOwnership = useCallback(
    (groupId: string, membershipId: string, expectedRevision?: number) =>
      controller.transferGroupOwnership(groupId, membershipId, expectedRevision),
    [controller],
  );
  const deleteGroup = useCallback(
    (groupId: string, expectedRevision?: number) =>
      controller.deleteGroup(groupId, expectedRevision),
    [controller],
  );

  const value = useMemo<GroupsContextValue>(
    () => ({
      ...snapshot,
      revision,
      refreshGroups,
      createGroup,
      loadLeaderboard,
      setAnonymity,
      loadInvites,
      loadMembers,
      createInvite,
      revokeInvite,
      previewInvite,
      acceptInvite,
      updateGroupName,
      removeMember,
      leaveGroup,
      transferGroupOwnership,
      deleteGroup,
    }),
    [
      acceptInvite,
      createGroup,
      createInvite,
      loadInvites,
      loadMembers,
      loadLeaderboard,
      previewInvite,
      refreshGroups,
      revision,
      revokeInvite,
      setAnonymity,
      updateGroupName,
      removeMember,
      leaveGroup,
      transferGroupOwnership,
      deleteGroup,
      snapshot,
    ],
  );

  return (
    <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>
  );
}

export function useGroups() {
  const value = use(GroupsContext);
  if (!value) throw new Error("useGroups must be used within GroupsProvider");
  return value;
}
