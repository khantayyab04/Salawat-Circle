import { randomUUID } from "expo-crypto";
import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import { getSupabaseClient } from "@/lib/auth/supabase-client";
import { OfflineController } from "@/lib/offline/controller";
import type { OfflineAccountState } from "@/lib/offline/types";
import {
  createSupabaseEntriesGateway,
  type EntriesGateway,
} from "./entries-gateway";
import { EntriesStore } from "./entries-store";

type EntriesContextValue = EntriesStore["snapshot"] & {
  revision: number;
  create(amount: number): Promise<void>;
  update(id: string, amount: number, entryDate: string): Promise<void>;
  delete(id: string): Promise<void>;
  setGoal(amount: number): Promise<void>;
  clearGoal(): Promise<void>;
  loadMore(): Promise<void>;
  retrySync(): Promise<void>;
  retryOfflineLoad(): Promise<void>;
  resetOfflineState(): Promise<void>;
  keepServerVersion(entryId?: string): Promise<void>;
  reapplyConflict(entryId?: string): Promise<void>;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

function unavailableGateway(): EntriesGateway {
  const unavailable = async () => {
    throw new Error("INTERNAL");
  };
  return {
    getTimeZone: async (fallback) => fallback,
    getSummary: unavailable,
    list: unavailable,
    create: unavailable,
    update: unavailable,
    delete: unavailable,
    setGoal: unavailable,
  };
}

function defaultGateway() {
  try {
    return createSupabaseEntriesGateway(getSupabaseClient());
  } catch {
    return unavailableGateway();
  }
}

function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function createLazyOfflineStorage(accountId: string) {
  let storage: Promise<{
    load(): Promise<OfflineAccountState | null>;
    save(state: OfflineAccountState): Promise<void>;
    clear(): Promise<void>;
  }> | null = null;
  const getStorage = () => {
    storage ??= import("@/lib/offline/expo-storage").then(
      ({ createExpoOfflineStorage }) => createExpoOfflineStorage(accountId),
    );
    return storage;
  };
  return {
    async load() {
      return (await getStorage()).load();
    },
    async save(state: OfflineAccountState) {
      return (await getStorage()).save(state);
    },
    async clear() {
      return (await getStorage()).clear();
    },
  };
}

export function EntriesProvider({
  children,
  gateway: providedGateway,
  createId = randomUUID,
  enabled = true,
  accountId,
}: PropsWithChildren<{
  gateway?: EntriesGateway;
  createId?: () => string;
  enabled?: boolean;
  accountId?: string | null;
}>) {
  const gateway = useMemo(
    () => providedGateway ?? defaultGateway(),
    [providedGateway],
  );
  const offline = useMemo(
    () =>
      accountId
        ? new OfflineController(
            createLazyOfflineStorage(accountId),
            gateway,
            () => new Date(),
            createId,
          )
        : undefined,
    [accountId, createId, gateway],
  );
  const store = useMemo(
    () =>
      new EntriesStore(
        gateway,
        deviceTimeZone(),
        () => new Date(),
        createId,
        offline,
      ),
    [createId, gateway, offline],
  );

  const revision = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getVersion(),
  );
  useEffect(() => {
    if (enabled) void store.load();
  }, [enabled, store]);
  useEffect(() => {
    if (!offline) return;
    let active = true;
    let removeListener: (() => void) | undefined;
    void import("expo-network")
      .then(async ({ addNetworkStateListener, getNetworkStateAsync }) => {
        const apply = (state: {
          isConnected?: boolean;
          isInternetReachable?: boolean;
        }) => {
          if (!active) return;
          store.setOnline(
            state.isConnected !== false &&
              state.isInternetReachable !== false,
          );
        };
        apply(await getNetworkStateAsync());
        const subscription = addNetworkStateListener(apply);
        removeListener = () => subscription.remove();
      })
      .catch(() => store.setOnline(false));
    return () => {
      active = false;
      removeListener?.();
    };
  }, [offline, store]);
  useEffect(() => {
    if (!enabled || !offline) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void store.syncPending();
    });
    const interval = setInterval(() => void store.syncPending(), 5_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [enabled, offline, store]);

  const value: EntriesContextValue = {
    ...store.snapshot,
    revision,
    create: (amount) => store.create(amount),
    update: (id, amount, entryDate) => store.update(id, amount, entryDate),
    delete: (id) => store.delete(id),
    setGoal: (amount) => store.setGoal(amount),
    clearGoal: () => store.clearGoal(),
    loadMore: () => store.loadMore(),
    retrySync: () => store.retrySync(),
    retryOfflineLoad: () => store.retryOfflineLoad(),
    resetOfflineState: () => store.resetOfflineState(),
    keepServerVersion: (entryId) => store.keepServerVersion(entryId),
    reapplyConflict: (entryId) => store.reapplyConflict(entryId),
  };

  return (
    <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>
  );
}

export function useEntries() {
  const value = use(EntriesContext);
  if (!value) throw new Error("useEntries must be used within EntriesProvider");
  return value;
}
