import type {
  EntriesGateway,
  Entry,
  EntryCursor,
  EntrySummary,
} from "@/lib/entries/entries-gateway";
import {
  enqueueCreate,
  enqueueDelete,
  enqueueGoal,
  enqueueUpdate,
} from "./mutation-queue";
import { SyncEngine } from "./sync-engine";
import {
  emptyOfflineState,
  migrateOfflineState,
  type OfflineAccountState,
  type EntryConflict,
  type OfflineEntry,
} from "./types";

type OfflineStorage = {
  load(): Promise<OfflineAccountState | null>;
  save(state: OfflineAccountState): Promise<void>;
  clear(): Promise<void>;
};

type SyncRunner = {
  drain(state: OfflineAccountState): Promise<void>;
};

export class OfflineController {
  state = emptyOfflineState();
  private readonly syncRunner: SyncRunner;
  private transition = Promise.resolve();
  private loadFailed = false;
  private loadFailureCode = "INTERNAL";

  private cloneState(state: OfflineAccountState) {
    return JSON.parse(JSON.stringify(state)) as OfflineAccountState;
  }

  constructor(
    private readonly storage: OfflineStorage,
    private readonly gateway: EntriesGateway,
    private readonly now: () => Date,
    private readonly createId: () => string,
    syncRunner?: SyncRunner,
  ) {
    this.syncRunner =
      syncRunner ??
      new SyncEngine(
        gateway,
        {
          save: async (state) => {
            await this.storage.save(state);
            this.state = this.cloneState(state);
          },
        },
        now,
        Math.random,
      );
  }

  private runExclusive<T>(action: () => Promise<T>): Promise<T> {
    const result = this.transition.then(action);
    this.transition = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  load() {
    return this.runExclusive(async () => {
      try {
        this.state = migrateOfflineState(await this.storage.load());
        this.loadFailed = false;
        return this.state;
      } catch (error) {
        this.loadFailed = true;
        this.loadFailureCode =
          error instanceof Error && error.message === "INVALID_OFFLINE_STATE"
            ? "INVALID_OFFLINE_STATE"
            : "INTERNAL";
        throw error;
      }
    });
  }

  reset() {
    return this.runExclusive(async () => {
      await this.storage.clear();
      this.state = emptyOfflineState();
      this.loadFailed = false;
      this.loadFailureCode = "INTERNAL";
      return this.state;
    });
  }

  private ensureWritable() {
    if (this.loadFailed) throw new Error(this.loadFailureCode);
  }

  private mutate(action: (state: OfflineAccountState) => void) {
    return this.runExclusive(async () => {
      this.ensureWritable();
      const next = JSON.parse(JSON.stringify(this.state)) as OfflineAccountState;
      action(next);
      await this.storage.save(next);
      this.state = next;
    });
  }

  hydrate(input: {
    entries: Entry[];
    summary: EntrySummary;
    timeZone: string;
    serverCursor: EntryCursor | null;
    hasMore: boolean;
  }) {
    return this.runExclusive(async () => {
      this.ensureWritable();
      const next = JSON.parse(JSON.stringify(this.state)) as OfflineAccountState;
      const pendingById = new Map(
        next.entries
          .filter((entry) => entry.localState !== "synced")
          .map((entry) => [entry.id, entry]),
      );
      const serverEntries: OfflineEntry[] = input.entries.map((entry) => ({
        ...entry,
        localState: "synced",
        serverRevision: entry.revision,
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
      }));
      next.entries = [
        ...serverEntries.map((entry) => pendingById.get(entry.id) ?? entry),
        ...Array.from(pendingById.values()).filter(
          (entry) => !serverEntries.some(({ id }) => id === entry.id),
        ),
      ];
      if (next.queue.length === 0) next.summary = input.summary;
      next.timeZone = input.timeZone;
      next.serverCursor = input.serverCursor;
      next.hasMore = input.hasMore && input.serverCursor !== null;
      await this.storage.save(next);
      this.state = next;
      return this.state;
    });
  }

  appendPage(
    entries: Entry[],
    serverCursor: EntryCursor | null,
    hasMore: boolean,
  ) {
    return this.runExclusive(async () => {
      this.ensureWritable();
      const next = JSON.parse(JSON.stringify(this.state)) as OfflineAccountState;
      const existingIds = new Set(next.entries.map(({ id }) => id));
      next.entries.push(
        ...entries
          .filter(({ id }) => !existingIds.has(id))
          .map(
            (entry): OfflineEntry => ({
              ...entry,
              localState: "synced",
              serverRevision: entry.revision,
              lastAttemptAt: null,
              retryCount: 0,
              lastErrorCode: null,
            }),
          ),
      );
      next.serverCursor = serverCursor;
      next.hasMore = hasMore && serverCursor !== null;
      await this.storage.save(next);
      this.state = next;
      return this.state;
    });
  }

  async create(entry: OfflineEntry, summary?: EntrySummary, timeZone?: string) {
    await this.mutate((state) => {
      if (summary) state.summary = { ...summary };
      if (timeZone) state.timeZone = timeZone;
      enqueueCreate(state, entry, this.createId(), this.now().toISOString());
    });
  }

  async update(
    entryId: string,
    amount: number,
    entryDate: string,
    summary?: EntrySummary,
  ) {
    await this.mutate((state) => {
      if (summary) state.summary = { ...summary };
      enqueueUpdate(
        state,
        entryId,
        amount,
        entryDate,
        this.createId(),
        this.now().toISOString(),
      );
    });
  }

  async delete(entryId: string, summary?: EntrySummary) {
    await this.mutate((state) => {
      if (summary) state.summary = { ...summary };
      enqueueDelete(
        state,
        entryId,
        this.createId(),
        this.now().toISOString(),
      );
    });
  }

  async setGoal(amount: number | null, effectiveFrom: string) {
    await this.mutate((state) =>
      enqueueGoal(
        state,
        amount,
        effectiveFrom,
        this.createId(),
        this.now().toISOString(),
      ),
    );
  }

  sync(forcePendingNow = false) {
    return this.runExclusive(async () => {
      this.ensureWritable();
      let next = this.cloneState(this.state);
      if (forcePendingNow) {
        for (const mutation of next.queue) {
          if (mutation.status === "pending") mutation.nextAttemptAt = null;
        }
        await this.storage.save(next);
        this.state = this.cloneState(next);
        next = this.cloneState(next);
      }
      await this.syncRunner.drain(next);
      return this.state;
    });
  }

  async retryFailed() {
    await this.runExclusive(async () => {
      this.ensureWritable();
      for (const mutation of this.state.queue) {
        if (mutation.status === "failed") {
          mutation.status = "pending";
          mutation.nextAttemptAt = null;
          const entry = this.state.entries.find(
            ({ id }) => id === mutation.entityId,
          );
          if (entry && mutation.entity === "entry") {
            entry.localState =
              mutation.operation === "create"
                ? "pending_create"
                : mutation.operation === "delete"
                  ? "pending_delete"
                  : "pending_update";
            entry.lastErrorCode = null;
          }
        }
      }
      await this.storage.save(this.state);
    });
    return this.sync();
  }

  private ensureConflictCollection(state: OfflineAccountState) {
    if (!Array.isArray(state.conflicts)) state.conflicts = [];
    if (
      state.conflict &&
      !state.conflicts.some(
        ({ entryId }) => entryId === state.conflict?.entryId,
      )
    ) {
      state.conflicts.unshift(state.conflict);
    }
  }

  private selectedConflict(
    state: OfflineAccountState,
    entryId?: string,
  ): EntryConflict | null {
    this.ensureConflictCollection(state);
    if (entryId) {
      const selected =
        state.conflicts.find((conflict) => conflict.entryId === entryId) ??
        (state.conflict?.entryId === entryId ? state.conflict : null);
      if (selected) state.conflict = selected;
      return selected;
    }
    if (state.conflict) return state.conflict;
    const first = state.conflicts[0] ?? null;
    state.conflict = first;
    return first;
  }

  private removeConflict(state: OfflineAccountState, entryId: string) {
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

  keepServerVersion(entryId?: string) {
    return this.runExclusive(async () => {
      this.ensureWritable();
      const next = JSON.parse(JSON.stringify(this.state)) as OfflineAccountState;
      const conflict = this.selectedConflict(next, entryId);
      if (!conflict) return;
      next.queue = next.queue.filter(
        (mutation) =>
          mutation.entity !== "entry" ||
          mutation.entityId !== conflict.entryId,
      );
      const current = next.entries.find(
        (entry) => entry.id === conflict.entryId,
      );
      const replacement: OfflineEntry = {
        ...conflict.serverEntry,
        localState: "synced",
        serverRevision: conflict.serverEntry.revision,
        lastAttemptAt: null,
        retryCount: 0,
        lastErrorCode: null,
      };
      if (current) {
        next.entries[next.entries.indexOf(current)] = replacement;
      } else {
        next.entries.push(replacement);
      }
      this.removeConflict(next, conflict.entryId);
      await this.storage.save(next);
      this.state = next;
      if (next.timeZone) {
        try {
          const summary = await this.gateway.getSummary(next.timeZone);
          const withSummary = JSON.parse(
            JSON.stringify(this.state),
          ) as OfflineAccountState;
          withSummary.summary = summary;
          await this.storage.save(withSummary);
          this.state = withSummary;
        } catch {
          // The selected server entry is authoritative even if summary refresh fails.
        }
      }
    });
  }

  async reapplyConflict(entryId?: string) {
    await this.runExclusive(async () => {
      this.ensureWritable();
      const next = JSON.parse(JSON.stringify(this.state)) as OfflineAccountState;
      const conflict = this.selectedConflict(next, entryId);
      if (!conflict) return;
      const mutation = next.queue.find(
        (candidate) =>
          candidate.entity === "entry" &&
          candidate.entityId === conflict.entryId,
      );
      const entry = next.entries.find(
        (candidate) => candidate.id === conflict.entryId,
      );
      if (!mutation || !entry) throw new Error("NOT_FOUND");
      mutation.expectedRevision = conflict.serverEntry.revision;
      mutation.status = "pending";
      mutation.retryCount = 0;
      mutation.lastErrorCode = null;
      mutation.nextAttemptAt = null;
      entry.localState =
        mutation.operation === "delete" ? "pending_delete" : "pending_update";
      entry.serverRevision = conflict.serverEntry.revision;
      entry.retryCount = 0;
      entry.lastErrorCode = null;
      this.removeConflict(next, conflict.entryId);
      await this.storage.save(next);
      this.state = next;
    });
    await this.sync();
  }
}
