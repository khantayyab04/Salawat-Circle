import { randomUUID } from "expo-crypto";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
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

  useEffect(() => {
    if (!enabled || !accountId) {
      controller.reset();
      return;
    }
    void controller.initialize(accountId).catch(() => undefined);
  }, [accountId, controller, enabled]);

  const snapshot = store.getSnapshot();
  const value: GroupsContextValue = {
    ...snapshot,
    revision,
    refreshGroups: () => controller.refreshGroups(),
    createGroup: (name, timezone, leaderboardAnonymous, rulesAccepted) =>
      controller.createGroup(name, timezone, leaderboardAnonymous, rulesAccepted),
    loadLeaderboard: (groupId, period, options) =>
      controller.loadLeaderboard(groupId, period, options),
    setAnonymity: (groupId, anonymous, expectedRevision) =>
      controller.setAnonymity(groupId, anonymous, expectedRevision),
    loadInvites: (groupId) => controller.loadInvites(groupId),
    createInvite: (groupId, options) => controller.createInvite(groupId, options),
    revokeInvite: (groupId, inviteId) => controller.revokeInvite(groupId, inviteId),
    previewInvite: (kind, secret) => controller.previewInvite(kind, secret),
    acceptInvite: (kind, secret, locale) =>
      controller.acceptInvite(kind, secret, locale),
  };

  return (
    <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>
  );
}

export function useGroups() {
  const value = use(GroupsContext);
  if (!value) throw new Error("useGroups must be used within GroupsProvider");
  return value;
}
