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
import { GroupsController, type LoadLeaderboardOptions } from "./groups-controller";
import type { GroupsGateway } from "./groups-gateway";
import { createSupabaseGroupsGateway } from "./groups-gateway";
import { GroupsStore } from "./groups-store";
import type {
  AcceptInviteResponse,
  AppLocale,
  CreateGroupResponse,
  CreateInviteOptions,
  CreateInviteResponse,
  InviteKind,
  LeaderboardPeriod,
  RevokeInviteResponse,
  SetLeaderboardAnonymityResponse,
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

  const value = useMemo<GroupsContextValue>(
    () => ({
      ...snapshot,
      revision,
      refreshGroups,
      createGroup,
      loadLeaderboard,
      setAnonymity,
      loadInvites,
      createInvite,
      revokeInvite,
      previewInvite,
      acceptInvite,
    }),
    [
      acceptInvite,
      createGroup,
      createInvite,
      loadInvites,
      loadLeaderboard,
      previewInvite,
      refreshGroups,
      revision,
      revokeInvite,
      setAnonymity,
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
