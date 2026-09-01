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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isEntry(value: unknown): value is Entry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.amount === "string" &&
    typeof value.entryDate === "string" &&
    typeof value.timezone === "string" &&
    typeof value.recordedAtClient === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.revision === "number"
  );
}

function isOfflineEntry(value: unknown): value is OfflineEntry {
  return (
    isEntry(value) &&
    (value.localState === "synced" ||
      value.localState === "pending_create" ||
      value.localState === "pending_update" ||
      value.localState === "pending_delete" ||
      value.localState === "conflict" ||
      value.localState === "failed") &&
    (value.serverRevision === null ||
      typeof value.serverRevision === "number") &&
    isNullableString(value.lastAttemptAt) &&
    typeof value.retryCount === "number" &&
    isNullableString(value.lastErrorCode)
  );
}

function isEntrySummary(value: unknown): value is EntrySummary {
  return (
    isRecord(value) &&
    typeof value.todayTotal === "string" &&
    typeof value.weekTotal === "string" &&
    typeof value.allTimeTotal === "string" &&
    (value.todayGoal === null || typeof value.todayGoal === "string") &&
    typeof value.achievedDays === "string" &&
    typeof value.eligibleGoalDays === "string"
  );
}

function isEntryCursor(value: unknown): value is EntryCursor {
  return (
    isRecord(value) &&
    typeof value.entryDate === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.id === "string"
  );
}

function isEntryConflict(value: unknown): value is EntryConflict {
  return (
    isRecord(value) &&
    typeof value.entryId === "string" &&
    (value.operation === "update" || value.operation === "delete") &&
    typeof value.localAmount === "string" &&
    typeof value.localEntryDate === "string" &&
    isEntry(value.serverEntry)
  );
}

function hasQueueMetadata(value: Record<string, unknown>) {
  return (
    typeof value.id === "string" &&
    typeof value.entityId === "string" &&
    typeof value.createdAt === "string" &&
    (value.status === "pending" ||
      value.status === "failed" ||
      value.status === "conflict") &&
    isNullableString(value.lastAttemptAt) &&
    typeof value.retryCount === "number" &&
    isNullableString(value.lastErrorCode) &&
    isNullableString(value.nextAttemptAt)
  );
}

function isQueueMutation(value: unknown): value is QueueMutation {
  if (!isRecord(value) || !hasQueueMetadata(value)) return false;
  if (value.entity === "entry" && value.operation === "create") {
    return (
      value.expectedRevision === null &&
      isRecord(value.payload) &&
      typeof value.payload.amount === "number" &&
      typeof value.payload.entryDate === "string" &&
      typeof value.payload.timezone === "string" &&
      typeof value.payload.recordedAtClient === "string"
    );
  }
  if (value.entity === "entry" && value.operation === "update") {
    return (
      typeof value.expectedRevision === "number" &&
      isRecord(value.payload) &&
      typeof value.payload.amount === "number" &&
      typeof value.payload.entryDate === "string"
    );
  }
  if (value.entity === "entry" && value.operation === "delete") {
    return typeof value.expectedRevision === "number" && value.payload === null;
  }
  if (value.entity === "goal" && value.operation === "set_goal") {
    return (
      value.expectedRevision === null &&
      isRecord(value.payload) &&
      (value.payload.amount === null ||
        typeof value.payload.amount === "number") &&
      typeof value.payload.effectiveFrom === "string"
    );
  }
  return false;
}

export function migrateOfflineState(
  state: OfflineAccountState | null,
): OfflineAccountState {
  if (state === null) return emptyOfflineState();
  if (
    !isEntrySummary(state.summary) ||
    typeof state.timeZone !== "string" ||
    typeof state.hasMore !== "boolean" ||
    !Array.isArray(state.entries) ||
    !state.entries.every(isOfflineEntry) ||
    !Array.isArray(state.queue) ||
    !state.queue.every(isQueueMutation)
  ) {
    throw new Error("INVALID_OFFLINE_STATE");
  }
  if (
    state.queue.some(
      (mutation) =>
        mutation.entity === "entry" &&
        !state.entries.some(({ id }) => id === mutation.entityId),
    ) ||
    state.entries.some(
      (entry) =>
        entry.localState !== "synced" &&
        !state.queue.some(
          (mutation) =>
            mutation.entity === "entry" && mutation.entityId === entry.id,
        ),
    )
  ) {
    throw new Error("INVALID_OFFLINE_STATE");
  }
  const serverCursor = isEntryCursor(
    (state as OfflineAccountState & { serverCursor?: unknown }).serverCursor,
  )
    ? state.serverCursor
    : null;
  const persistedConflicts = (
    state as OfflineAccountState & { conflicts?: unknown }
  ).conflicts;
  if (
    persistedConflicts !== undefined &&
    (!Array.isArray(persistedConflicts) ||
      !persistedConflicts.every(isEntryConflict))
  ) {
    throw new Error("INVALID_OFFLINE_STATE");
  }
  const rawConflicts = persistedConflicts ? [...persistedConflicts] : [];
  if (
    state.conflict !== undefined &&
    state.conflict !== null &&
    !isEntryConflict(state.conflict)
  ) {
    throw new Error("INVALID_OFFLINE_STATE");
  }
  const legacyConflict = state.conflict ?? null;
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
  const conflictIds = new Set(rawConflicts.map(({ entryId }) => entryId));
  const repairedConflictErrors = new Map<string, string>();
  const queue: QueueMutation[] = state.queue.map((mutation) => {
    if (
      persistedConflicts === undefined &&
      mutation.status === "conflict" &&
      mutation.entity === "entry" &&
      (mutation.operation === "update" || mutation.operation === "delete") &&
      !conflictIds.has(mutation.entityId)
    ) {
      const errorCode =
        mutation.lastErrorCode ?? "ENTRY_VERSION_CONFLICT";
      repairedConflictErrors.set(mutation.entityId, errorCode);
      return {
        ...mutation,
        status: "failed",
        lastErrorCode: errorCode,
        nextAttemptAt: null,
      };
    }
    return mutation;
  });
  const entries: OfflineEntry[] = state.entries.map((entry) => {
    const errorCode = repairedConflictErrors.get(entry.id);
    return errorCode
      ? { ...entry, localState: "failed", lastErrorCode: errorCode }
      : entry;
  });
  if (
    conflictIds.size !== rawConflicts.length ||
    queue.some(
      (mutation) =>
        mutation.status === "conflict" &&
        (mutation.entity !== "entry" ||
          (mutation.operation !== "update" &&
            mutation.operation !== "delete") ||
          !conflictIds.has(mutation.entityId)),
    ) ||
    rawConflicts.some(
      ({ entryId }) =>
        !queue.some(
          (mutation) =>
            mutation.entity === "entry" &&
            mutation.entityId === entryId &&
            mutation.status === "conflict",
        ),
    )
  ) {
    throw new Error("INVALID_OFFLINE_STATE");
  }
  return {
    ...emptyOfflineState(),
    ...state,
    entries,
    queue,
    conflicts: rawConflicts,
    conflict,
    serverCursor,
    hasMore: state.hasMore && serverCursor !== null,
  };
}
