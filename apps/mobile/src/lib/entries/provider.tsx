import { randomUUID } from "expo-crypto";
import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabaseClient } from "@/lib/auth/supabase-client";
import {
  createSupabaseEntriesGateway,
  type EntriesGateway,
} from "./entries-gateway";
import { EntriesStore } from "./entries-store";

type EntriesContextValue = EntriesStore["snapshot"] & {
  create(amount: number): Promise<void>;
  update(id: string, amount: number, entryDate: string): Promise<void>;
  delete(id: string): Promise<void>;
  loadMore(): Promise<void>;
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

export function EntriesProvider({
  children,
  gateway: providedGateway,
  createId = randomUUID,
  enabled = true,
}: PropsWithChildren<{
  gateway?: EntriesGateway;
  createId?: () => string;
  enabled?: boolean;
}>) {
  const [revision, render] = useState(0);
  const gateway = useMemo(
    () => providedGateway ?? defaultGateway(),
    [providedGateway],
  );
  const store = useMemo(
    () => new EntriesStore(gateway, deviceTimeZone(), () => new Date(), createId),
    [createId, gateway],
  );

  useEffect(() => store.subscribe(() => render((value) => value + 1)), [store]);
  useEffect(() => {
    if (enabled) void store.load();
  }, [enabled, store]);

  void revision;
  const value: EntriesContextValue = {
    ...store.snapshot,
    create: (amount) => store.create(amount),
    update: (id, amount, entryDate) => store.update(id, amount, entryDate),
    delete: (id) => store.delete(id),
    loadMore: () => store.loadMore(),
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
