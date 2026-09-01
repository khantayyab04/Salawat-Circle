import type {
  OfflineAccountState,
  OfflineEntry,
  QueueMutation,
} from "./types";

function queueMeta(id: string, now: string) {
  return {
    id,
    createdAt: now,
    status: "pending" as const,
    lastAttemptAt: null,
    retryCount: 0,
    lastErrorCode: null,
    nextAttemptAt: null,
  };
}

function entryAndMutation(state: OfflineAccountState, entryId: string) {
  const entry = state.entries.find((candidate) => candidate.id === entryId);
  if (!entry) throw new Error("NOT_FOUND");
  const mutation = state.queue.find(
    (candidate) => candidate.entity === "entry" && candidate.entityId === entryId,
  );
  return { entry, mutation };
}

function assertNoConflict(
  state: OfflineAccountState,
  entryId: string,
  mutation: QueueMutation | undefined,
) {
  if (
    mutation?.status === "conflict" ||
    state.conflicts.some((conflict) => conflict.entryId === entryId) ||
    state.conflict?.entryId === entryId
  ) {
    throw new Error("ENTRY_VERSION_CONFLICT");
  }
}

export function enqueueCreate(
  state: OfflineAccountState,
  entry: OfflineEntry,
  mutationId: string,
  now: string,
) {
  entry.localState = "pending_create";
  state.entries.unshift(entry);
  state.queue.push({
    ...queueMeta(mutationId, now),
    entity: "entry",
    operation: "create",
    entityId: entry.id,
    payload: {
      amount: Number(entry.amount),
      entryDate: entry.entryDate,
      timezone: entry.timezone,
      recordedAtClient: entry.recordedAtClient,
    },
    expectedRevision: null,
  });
}

export function enqueueUpdate(
  state: OfflineAccountState,
  entryId: string,
  amount: number,
  entryDate: string,
  mutationId: string,
  now: string,
) {
  const { entry, mutation } = entryAndMutation(state, entryId);
  assertNoConflict(state, entryId, mutation);
  entry.amount = String(amount);
  entry.entryDate = entryDate;
  entry.updatedAt = now;
  entry.lastErrorCode = null;
  entry.retryCount = 0;
  if (mutation?.operation === "create") {
    mutation.payload.amount = amount;
    mutation.payload.entryDate = entryDate;
    return;
  }
  const expectedRevision = mutation?.expectedRevision ?? entry.serverRevision;
  if (!expectedRevision) throw new Error("INVALID_REVISION");
  const replacement: QueueMutation = {
    ...queueMeta(mutation?.id ?? mutationId, mutation?.createdAt ?? now),
    entity: "entry",
    operation: "update",
    entityId: entryId,
    payload: { amount, entryDate },
    expectedRevision,
  };
  if (mutation) state.queue[state.queue.indexOf(mutation)] = replacement;
  else state.queue.push(replacement);
  entry.localState = "pending_update";
}

export function enqueueDelete(
  state: OfflineAccountState,
  entryId: string,
  mutationId: string,
  now: string,
) {
  const { entry, mutation } = entryAndMutation(state, entryId);
  assertNoConflict(state, entryId, mutation);
  if (mutation?.operation === "create") {
    state.queue.splice(state.queue.indexOf(mutation), 1);
    state.entries.splice(state.entries.indexOf(entry), 1);
    return;
  }
  const expectedRevision = mutation?.expectedRevision ?? entry.serverRevision;
  if (!expectedRevision) throw new Error("INVALID_REVISION");
  const replacement: QueueMutation = {
    ...queueMeta(mutation?.id ?? mutationId, mutation?.createdAt ?? now),
    entity: "entry",
    operation: "delete",
    entityId: entryId,
    payload: null,
    expectedRevision,
  };
  if (mutation) state.queue[state.queue.indexOf(mutation)] = replacement;
  else state.queue.push(replacement);
  entry.localState = "pending_delete";
  entry.lastErrorCode = null;
  entry.retryCount = 0;
}

export function enqueueGoal(
  state: OfflineAccountState,
  amount: number | null,
  effectiveFrom: string,
  mutationId: string,
  now: string,
) {
  const existing = state.queue.find(
    (candidate) =>
      candidate.entity === "goal" && candidate.entityId === effectiveFrom,
  );
  const replacement: QueueMutation = {
    ...queueMeta(existing?.id ?? mutationId, existing?.createdAt ?? now),
    entity: "goal",
    operation: "set_goal",
    entityId: effectiveFrom,
    payload: { amount, effectiveFrom },
    expectedRevision: null,
  };
  if (existing) state.queue[state.queue.indexOf(existing)] = replacement;
  else state.queue.push(replacement);
  state.summary.todayGoal = amount === null ? null : String(amount);
}
