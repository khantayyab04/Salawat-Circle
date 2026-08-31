import type {
  EntriesGateway,
  Entry,
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
  type OfflineAccountState,
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

  constructor(
    private readonly storage: OfflineStorage,
    private readonly gateway: EntriesGateway,
    private readonly now: () => Date,
    private readonly createId: () => string,
    syncRunner?: SyncRunner,
  ) {
    this.syncRunner =
      syncRunner ?? new SyncEngine(gateway, storage, now, Math.random);
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
      this.state = (await this.storage.load()) ?? emptyOfflineState();
      return this.state;
    });
  }

  private mutate(action: (state: OfflineAccountState) => void) {
    return this.runExclusive(async () => {
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
    hasMore: boolean;
  }) {
    return this.runExclusive(async () => {
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
      const retainedSynced = next.entries.filter(
        (entry) =>
          entry.localState === "synced" &&
          input.hasMore &&
          !serverEntries.some(({ id }) => id === entry.id),
      );
      next.entries = [
        ...serverEntries.map((entry) => pendingById.get(entry.id) ?? entry),
        ...Array.from(pendingById.values()).filter(
          (entry) => !serverEntries.some(({ id }) => id === entry.id),
        ),
        ...retainedSynced,
      ];
      if (next.queue.length === 0) next.summary = input.summary;
      next.timeZone = input.timeZone;
      next.hasMore = input.hasMore;
      await this.storage.save(next);
      this.state = next;
      return this.state;
    });
  }

  appendPage(entries: Entry[], hasMore: boolean) {
    return this.runExclusive(async () => {
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
      next.hasMore = hasMore;
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
      if (forcePendingNow) {
        for (const mutation of this.state.queue) {
          if (mutation.status === "pending") mutation.nextAttemptAt = null;
        }
        await this.storage.save(this.state);
      }
      await this.syncRunner.drain(this.state);
      return this.state;
    });
  }

  async retryFailed() {
    await this.runExclusive(async () => {
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

  keepServerVersion() {
    return this.runExclusive(async () => {
      const conflict = this.state.conflict;
      if (!conflict) return;
      this.state.queue = this.state.queue.filter(
        (mutation) => mutation.entityId !== conflict.entryId,
      );
      const current = this.state.entries.find(
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
        this.state.entries[this.state.entries.indexOf(current)] = replacement;
      } else {
        this.state.entries.push(replacement);
      }
      this.state.conflict = null;
      await this.storage.save(this.state);
      if (this.state.timeZone) {
        try {
          this.state.summary = await this.gateway.getSummary(this.state.timeZone);
          await this.storage.save(this.state);
        } catch {
          // The selected server entry is authoritative even if summary refresh fails.
        }
      }
    });
  }

  async reapplyConflict() {
    await this.runExclusive(async () => {
      const conflict = this.state.conflict;
      if (!conflict) return;
      const mutation = this.state.queue.find(
        (candidate) => candidate.entityId === conflict.entryId,
      );
      const entry = this.state.entries.find(
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
      this.state.conflict = null;
      await this.storage.save(this.state);
    });
    await this.sync();
  }
}
