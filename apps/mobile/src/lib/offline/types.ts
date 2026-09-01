import type {
  Entry,
  EntryCursor,
  EntrySummary,
} from "@/lib/entries/entries-gateway";

export type LocalState =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "conflict"
  | "failed";

export type OfflineEntry = Entry & {
  localState: LocalState;
  serverRevision: number | null;
  lastAttemptAt: string | null;
  retryCount: number;
  lastErrorCode: string | null;
};

export type EntryMutation =
  | {
      id: string;
      entity: "entry";
      operation: "create";
      entityId: string;
      payload: {
        amount: number;
        entryDate: string;
        timezone: string;
        recordedAtClient: string;
      };
      expectedRevision: null;
    }
  | {
      id: string;
      entity: "entry";
      operation: "update";
      entityId: string;
      payload: { amount: number; entryDate: string };
      expectedRevision: number;
    }
  | {
      id: string;
      entity: "entry";
      operation: "delete";
      entityId: string;
      payload: null;
      expectedRevision: number;
    }
  | {
      id: string;
      entity: "goal";
      operation: "set_goal";
      entityId: string;
      payload: { amount: number | null; effectiveFrom: string };
      expectedRevision: null;
    };

export type QueueMutation = EntryMutation & {
  createdAt: string;
  status: "pending" | "failed" | "conflict";
  lastAttemptAt: string | null;
  retryCount: number;
  lastErrorCode: string | null;
  nextAttemptAt: string | null;
};

export type EntryConflict = {
  entryId: string;
  operation: "update" | "delete";
  localAmount: string;
  localEntryDate: string;
  serverEntry: Entry;
};

export type OfflineAccountState = {
  entries: OfflineEntry[];
  summary: EntrySummary;
  timeZone: string;
  queue: QueueMutation[];
  conflicts: EntryConflict[];
  conflict: EntryConflict | null;
  serverCursor: EntryCursor | null;
  hasMore: boolean;
};

export const EMPTY_SUMMARY: EntrySummary = {
  todayTotal: "0",
  weekTotal: "0",
  allTimeTotal: "0",
  todayGoal: null,
  achievedDays: "0",
  eligibleGoalDays: "0",
};

export function emptyOfflineState(): OfflineAccountState {
  return {
    entries: [],
    summary: { ...EMPTY_SUMMARY },
    timeZone: "",
    queue: [],
    conflicts: [],
    conflict: null,
    serverCursor: null,
    hasMore: false,
  };
}

function isEntryCursor(value: unknown): value is EntryCursor {
  return (
    typeof value === "object" &&
    value !== null &&
    "entryDate" in value &&
    typeof value.entryDate === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "id" in value &&
    typeof value.id === "string"
  );
}

function isEntryConflict(value: unknown): value is EntryConflict {
  return (
    typeof value === "object" &&
    value !== null &&
    "entryId" in value &&
    typeof value.entryId === "string" &&
    "operation" in value &&
    (value.operation === "update" || value.operation === "delete") &&
    "localAmount" in value &&
    typeof value.localAmount === "string" &&
    "localEntryDate" in value &&
    typeof value.localEntryDate === "string" &&
    "serverEntry" in value &&
    typeof value.serverEntry === "object" &&
    value.serverEntry !== null
  );
}

export function migrateOfflineState(
  state: OfflineAccountState | null,
): OfflineAccountState {
  if (!state) return emptyOfflineState();
  const serverCursor = isEntryCursor(
    (state as OfflineAccountState & { serverCursor?: unknown }).serverCursor,
  )
    ? state.serverCursor
    : null;
  const rawConflicts = Array.isArray(
    (state as OfflineAccountState & { conflicts?: unknown }).conflicts,
  )
    ? state.conflicts.filter(isEntryConflict)
    : [];
  const legacyConflict = isEntryConflict(state.conflict)
    ? state.conflict
    : null;
  if (
    legacyConflict &&
    !rawConflicts.some((conflict) => conflict.entryId === legacyConflict.entryId)
  ) {
    rawConflicts.unshift(legacyConflict);
  }
  const conflict = legacyConflict
    ? rawConflicts.find(({ entryId }) => entryId === legacyConflict.entryId) ??
      legacyConflict
    : rawConflicts[0] ?? null;
  return {
    ...emptyOfflineState(),
    ...state,
    entries: Array.isArray(state.entries) ? state.entries : [],
    queue: Array.isArray(state.queue) ? state.queue : [],
    conflicts: rawConflicts,
    conflict,
    serverCursor,
    hasMore: Boolean(state.hasMore) && serverCursor !== null,
  };
}
