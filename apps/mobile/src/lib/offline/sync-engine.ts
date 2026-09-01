import type { EntriesGateway } from "@/lib/entries/entries-gateway";
import { getEntriesErrorCode } from "@/lib/entries/errors";
import { classifySyncError, retryAt } from "./retry-policy";
import type {
  EntryConflict,
  OfflineAccountState,
  OfflineEntry,
  QueueMutation,
} from "./types";

type StateStorage = {
  save(state: OfflineAccountState): Promise<void>;
};

export class SyncEngine {
  constructor(
    private readonly gateway: EntriesGateway,
    private readonly storage: StateStorage,
    private readonly now: () => Date,
    private readonly random: () => number = Math.random,
  ) {}

  private entry(state: OfflineAccountState, id: string) {
    return state.entries.find((candidate) => candidate.id === id);
  }

  private updateEntryFailure(
    entry: OfflineEntry | undefined,
    mutation: QueueMutation,
    localState: OfflineEntry["localState"],
  ) {
    if (!entry) return;
    entry.localState = localState;
    entry.lastAttemptAt = mutation.lastAttemptAt;
    entry.retryCount = mutation.retryCount;
    entry.lastErrorCode = mutation.lastErrorCode;
  }

  private pendingLocalState(mutation: QueueMutation): OfflineEntry["localState"] {
    if (mutation.operation === "create") return "pending_create";
    if (mutation.operation === "delete") return "pending_delete";
    return "pending_update";
  }

  private upsertConflict(state: OfflineAccountState, conflict: EntryConflict) {
    const existing = state.conflicts.findIndex(
      ({ entryId }) => entryId === conflict.entryId,
    );
    if (existing >= 0) state.conflicts[existing] = conflict;
    else state.conflicts.push(conflict);
    if (!state.conflict || state.conflict.entryId === conflict.entryId) {
      state.conflict = conflict;
    }
  }

  private clearConflict(state: OfflineAccountState, entryId: string) {
    state.conflicts = state.conflicts.filter(
      (conflict) => conflict.entryId !== entryId,
    );
    if (
      state.conflict?.entryId === entryId ||
      !state.conflict ||
      !state.conflicts.some(
        (conflict) => conflict.entryId === state.conflict?.entryId,
      )
    ) {
      state.conflict = state.conflicts[0] ?? null;
    }
  }

  private async execute(mutation: QueueMutation) {
    switch (mutation.operation) {
      case "create":
        return this.gateway.create({
          id: mutation.entityId,
          ...mutation.payload,
        });
      case "update":
        return this.gateway.update({
          id: mutation.entityId,
          ...mutation.payload,
          expectedRevision: mutation.expectedRevision,
        });
      case "delete":
        await this.gateway.delete({
          id: mutation.entityId,
          expectedRevision: mutation.expectedRevision,
        });
        return null;
      case "set_goal":
        await this.gateway.setGoal(
          mutation.payload.amount,
          mutation.payload.effectiveFrom,
        );
        return null;
    }
  }

  private applySuccess(
    state: OfflineAccountState,
    mutation: QueueMutation,
    result: Awaited<ReturnType<SyncEngine["execute"]>>,
  ) {
    const entry =
      mutation.entity === "entry"
        ? this.entry(state, mutation.entityId)
        : undefined;
    if ((mutation.operation === "create" || mutation.operation === "update") && result) {
      const replacement: OfflineEntry = {
        ...result,
        localState: "synced",
        serverRevision: result.revision,
        lastAttemptAt: mutation.lastAttemptAt,
        retryCount: 0,
        lastErrorCode: null,
      };
      if (entry) {
        const entryIndex = state.entries.indexOf(entry);
        if (entryIndex >= 0) state.entries[entryIndex] = replacement;
      }
      else state.entries.push(replacement);
    } else if (mutation.operation === "delete" && entry) {
      const entryIndex = state.entries.indexOf(entry);
      if (entryIndex >= 0) state.entries.splice(entryIndex, 1);
    }
    if (mutation.entity === "entry") {
      this.clearConflict(state, mutation.entityId);
    }
    const mutationIndex = state.queue.indexOf(mutation);
    if (mutationIndex >= 0) state.queue.splice(mutationIndex, 1);
  }

  private async applyFailure(
    state: OfflineAccountState,
    mutation: QueueMutation,
    code: ReturnType<typeof getEntriesErrorCode>,
  ): Promise<boolean> {
    const entry =
      mutation.entity === "entry"
        ? this.entry(state, mutation.entityId)
        : undefined;
    mutation.lastErrorCode = code;
    mutation.lastAttemptAt = this.now().toISOString();
    mutation.retryCount += 1;
    const kind = classifySyncError(code);
    if (kind === "retry") {
      mutation.status = "pending";
      mutation.nextAttemptAt = retryAt(
        this.now(),
        mutation.retryCount,
        this.random,
      ).toISOString();
      this.updateEntryFailure(entry, mutation, entry?.localState ?? "failed");
      return false;
    }
    if (kind === "conflict" && mutation.entity === "entry") {
      if (
        entry &&
        (mutation.operation === "update" || mutation.operation === "delete") &&
        this.gateway.getEntry
      ) {
        let serverEntry;
        try {
          serverEntry = await this.gateway.getEntry(mutation.entityId);
        } catch (fetchError) {
          const fetchCode = getEntriesErrorCode(fetchError);
          mutation.lastErrorCode = fetchCode;
          if (
            mutation.operation === "delete" &&
            fetchCode === "NOT_FOUND"
          ) {
            this.applySuccess(state, mutation, null);
            return true;
          }
          const fetchKind = classifySyncError(fetchCode);
          if (fetchKind === "retry") {
            mutation.status = "pending";
            mutation.nextAttemptAt = retryAt(
              this.now(),
              mutation.retryCount,
              this.random,
            ).toISOString();
            this.updateEntryFailure(
              entry,
              mutation,
              this.pendingLocalState(mutation),
            );
            return false;
          }
          mutation.status = "failed";
          mutation.nextAttemptAt = null;
          this.updateEntryFailure(entry, mutation, "failed");
          return false;
        }
        if (
          mutation.operation === "update" &&
          serverEntry.amount === String(mutation.payload.amount) &&
          serverEntry.entryDate === mutation.payload.entryDate
        ) {
          this.applySuccess(state, mutation, serverEntry);
          return true;
        }
        mutation.status = "conflict";
        mutation.nextAttemptAt = null;
        this.updateEntryFailure(entry, mutation, "conflict");
        this.upsertConflict(state, {
          entryId: mutation.entityId,
          operation: mutation.operation,
          localAmount: entry.amount,
          localEntryDate: entry.entryDate,
          serverEntry,
        });
        return false;
      }
      mutation.status = "failed";
      mutation.nextAttemptAt = null;
      this.updateEntryFailure(entry, mutation, "failed");
      return false;
    }
    mutation.status = "failed";
    mutation.nextAttemptAt = null;
    this.updateEntryFailure(entry, mutation, "failed");
    return false;
  }

  async drain(state: OfflineAccountState): Promise<void> {
    let changedServerData = false;
    let refreshedSession = false;
    for (const mutation of [...state.queue]) {
      if (mutation.status !== "pending") continue;
      if (
        mutation.nextAttemptAt &&
        new Date(mutation.nextAttemptAt) > this.now()
      ) {
        continue;
      }
      mutation.lastAttemptAt = this.now().toISOString();
      try {
        let result;
        try {
          result = await this.execute(mutation);
        } catch (error) {
          if (
            getEntriesErrorCode(error) === "AUTH_REQUIRED" &&
            !refreshedSession &&
            this.gateway.refreshSession
          ) {
            refreshedSession = true;
            try {
              await this.gateway.refreshSession();
            } catch {
              throw new Error("AUTH_REQUIRED");
            }
            result = await this.execute(mutation);
          } else {
            throw error;
          }
        }
        this.applySuccess(state, mutation, result);
        changedServerData = true;
      } catch (error) {
        const code = getEntriesErrorCode(error);
        changedServerData =
          (await this.applyFailure(state, mutation, code)) ||
          changedServerData;
        await this.storage.save(state);
        if (code === "AUTH_REQUIRED") break;
        continue;
      }
      await this.storage.save(state);
    }
    if (changedServerData && state.timeZone) {
      try {
        state.summary = await this.gateway.getSummary(state.timeZone);
        await this.storage.save(state);
      } catch {
        // Synced mutations remain canonical even if the derived summary refresh fails.
      }
    }
  }
}
