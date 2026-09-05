import { getPersonalDate, getWeekStart } from "./calendar";
import { getEntriesErrorCode, type EntriesErrorCode } from "./errors";
import type { EntriesGateway, Entry, EntrySummary } from "./entries-gateway";
import { addTotal, subtractTotal } from "./totals";
import type { OfflineController } from "@/lib/offline/controller";
import type { EntryConflict, OfflineEntry } from "@/lib/offline/types";
import type { ProgressOverview } from "@/lib/progress-overview";

export type EntriesViewState = "loading" | "content" | "empty" | "error";
export type EntriesSyncState =
  | "idle"
  | "offline"
  | "pending"
  | "error"
  | "conflict";

export class EntriesStore {
  readonly snapshot = {
    viewState: "loading" as EntriesViewState,
    entries: [] as Entry[],
    summary: {
      todayTotal: "0",
      weekTotal: "0",
      allTimeTotal: "0",
      todayGoal: null,
      achievedDays: "0",
      eligibleGoalDays: "0",
    } as EntrySummary,
    timeZone: "",
    hasMore: false,
    loadingMore: false,
    paginationError: false,
    busy: false,
    online: true,
    syncState: "idle" as EntriesSyncState,
    pendingCount: 0,
    failedCount: 0,
    errorCode: null as EntriesErrorCode | null,
    offlineLoadErrorCode: null as
      | "INVALID_OFFLINE_STATE"
      | "INTERNAL"
      | null,
    conflictEntryId: null as string | null,
    conflict: null as EntryConflict | null,
    conflicts: [] as EntryConflict[],
    progressOverview: null as ProgressOverview | null,
    progressLoading: false,
  };

  private readonly listeners = new Set<() => void>();
  private version = 0;
  private syncing = false;

  constructor(
    private readonly gateway: EntriesGateway,
    private readonly fallbackTimeZone: string,
    private readonly now: () => Date,
    private readonly createId: () => string,
    private readonly offline?: OfflineController,
  ) {}

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getVersion() {
    return this.version;
  }

  private notify() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  private setError(error: unknown) {
    this.snapshot.errorCode = getEntriesErrorCode(error);
  }

  private sortEntries() {
    this.snapshot.entries.sort(
      (left, right) =>
        right.entryDate.localeCompare(left.entryDate) ||
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
  }

  private applyOfflineState() {
    if (!this.offline) return;
    const state = this.offline.state;
    this.snapshot.entries = state.entries.filter(
      (entry) => entry.localState !== "pending_delete",
    );
    this.snapshot.summary = state.summary;
    this.snapshot.timeZone = state.timeZone || this.fallbackTimeZone;
    this.snapshot.hasMore = state.hasMore;
    this.snapshot.conflicts = state.conflicts;
    this.snapshot.conflict = state.conflict ?? state.conflicts[0] ?? null;
    this.snapshot.conflictEntryId = this.snapshot.conflict?.entryId ?? null;
    this.snapshot.pendingCount = state.queue.filter(
      ({ status }) => status === "pending",
    ).length;
    this.snapshot.failedCount = state.queue.filter(
      ({ status }) => status === "failed",
    ).length;
    this.snapshot.syncState = state.conflicts.length > 0
      ? "conflict"
      : this.snapshot.failedCount > 0
        ? "error"
        : this.snapshot.pendingCount > 0
          ? this.snapshot.online
            ? "pending"
            : "offline"
          : this.snapshot.online
            ? "idle"
            : "offline";
    this.snapshot.viewState = this.snapshot.entries.length ? "content" : "empty";
    this.sortEntries();
  }

  async load() {
    let hasCachedState = false;
    if (this.offline) {
      let cached;
      try {
        cached = await this.offline.load();
        this.snapshot.offlineLoadErrorCode = null;
      } catch (error) {
        this.snapshot.offlineLoadErrorCode =
          getEntriesErrorCode(error) === "INVALID_OFFLINE_STATE"
            ? "INVALID_OFFLINE_STATE"
            : "INTERNAL";
        this.snapshot.errorCode = this.snapshot.offlineLoadErrorCode;
        this.snapshot.viewState = "error";
        this.notify();
        return;
      }
      hasCachedState =
        cached.entries.length > 0 ||
        cached.queue.length > 0 ||
        Boolean(cached.timeZone);
      if (hasCachedState) {
        this.applyOfflineState();
        this.notify();
      }
    }
    if (!hasCachedState) this.snapshot.viewState = "loading";
    this.snapshot.errorCode = null;
    this.notify();
    try {
      this.snapshot.timeZone = await this.gateway.getTimeZone(
        this.fallbackTimeZone,
      );
      const [summary, page] = await Promise.all([
        this.gateway.getSummary(this.snapshot.timeZone),
        this.gateway.list(null, 30),
      ]);
      if (this.offline) {
        await this.offline.hydrate({
          entries: page.items,
          summary,
          timeZone: this.snapshot.timeZone,
          serverCursor: page.nextCursor,
          hasMore: page.hasMore,
        });
        this.applyOfflineState();
      } else {
        this.snapshot.summary = summary;
        const loadedIds = new Set(page.items.map((entry) => entry.id));
        this.snapshot.entries = [
          ...page.items,
          ...this.snapshot.entries.filter((entry) => !loadedIds.has(entry.id)),
        ];
        this.sortEntries();
        this.snapshot.hasMore = page.hasMore;
        this.snapshot.viewState = page.items.length ? "content" : "empty";
      }
    } catch (error) {
      this.setError(error);
      this.snapshot.viewState = hasCachedState
        ? this.snapshot.entries.length
          ? "content"
          : "empty"
        : "error";
    }
    this.notify();
    if (this.offline && this.snapshot.online) void this.syncPending();
  }

  async loadProgressOverview(days = 35) {
    if (!this.gateway.getProgressOverview || !this.snapshot.timeZone) return;
    this.snapshot.progressLoading = true;
    this.notify();
    try {
      this.snapshot.progressOverview = await this.gateway.getProgressOverview(
        this.snapshot.timeZone,
        days,
      );
    } finally {
      this.snapshot.progressLoading = false;
      this.notify();
    }
  }

  private applyAmount(entry: Entry, amount: string, direction: "add" | "subtract") {
    const operation = direction === "add" ? addTotal : subtractTotal;
    this.snapshot.summary.allTimeTotal = operation(
      this.snapshot.summary.allTimeTotal,
      amount,
    );
    const today = getPersonalDate(this.now(), this.snapshot.timeZone);
    if (entry.entryDate === today) {
      this.snapshot.summary.todayTotal = operation(
        this.snapshot.summary.todayTotal,
        amount,
      );
    }
    if (
      entry.entryDate >= getWeekStart(today) &&
      entry.entryDate <= today
    ) {
      this.snapshot.summary.weekTotal = operation(
        this.snapshot.summary.weekTotal,
        amount,
      );
    }
  }

  private async refreshSummary() {
    try {
      this.snapshot.summary = await this.gateway.getSummary(
        this.snapshot.timeZone,
      );
    } catch {
      // The optimistic values remain the best available current view.
    }
  }

  async create(amount: number) {
    if (this.snapshot.busy) return;
    const recordedAtClient = this.now().toISOString();
    const timeZone = this.snapshot.timeZone || this.fallbackTimeZone;
    const optimistic: Entry = {
      id: this.createId(),
      amount: String(amount),
      entryDate: getPersonalDate(
        new Date(recordedAtClient),
        timeZone,
      ),
      timezone: timeZone,
      recordedAtClient,
      createdAt: recordedAtClient,
      updatedAt: recordedAtClient,
      revision: 0,
      localState: this.offline ? "pending_create" : undefined,
      serverRevision: this.offline ? null : undefined,
      lastAttemptAt: this.offline ? null : undefined,
      retryCount: this.offline ? 0 : undefined,
      lastErrorCode: this.offline ? null : undefined,
    };
    this.snapshot.busy = true;
    this.snapshot.errorCode = null;
    this.snapshot.timeZone = timeZone;
    this.snapshot.entries = [optimistic, ...this.snapshot.entries];
    this.sortEntries();
    this.applyAmount(optimistic, optimistic.amount, "add");
    this.snapshot.viewState = "content";
    this.notify();
    if (this.offline) {
      try {
        await this.offline.create(
          optimistic as OfflineEntry,
          this.snapshot.summary,
          timeZone,
        );
        this.applyOfflineState();
        void this.syncPending();
      } catch (error) {
        this.snapshot.entries = this.snapshot.entries.filter(
          (entry) => entry.id !== optimistic.id,
        );
        this.applyAmount(optimistic, optimistic.amount, "subtract");
        this.snapshot.viewState = this.snapshot.entries.length
          ? "content"
          : "empty";
        const errorCode = getEntriesErrorCode(error);
        this.snapshot.errorCode = errorCode;
        throw new Error(errorCode);
      } finally {
        this.snapshot.busy = false;
        this.notify();
      }
      return;
    }
    try {
      const entry = await this.gateway.create({
        id: optimistic.id,
        amount,
        entryDate: optimistic.entryDate,
        timezone: optimistic.timezone,
        recordedAtClient,
      });
      this.snapshot.entries = this.snapshot.entries.map((candidate) =>
        candidate.id === entry.id ? entry : candidate,
      );
      this.sortEntries();
      await this.refreshSummary();
    } catch (error) {
      this.snapshot.entries = this.snapshot.entries.filter(
        (entry) => entry.id !== optimistic.id,
      );
      this.applyAmount(optimistic, optimistic.amount, "subtract");
      this.snapshot.viewState = this.snapshot.entries.length ? "content" : "empty";
      const errorCode = getEntriesErrorCode(error);
      this.snapshot.errorCode = errorCode;
      throw new Error(errorCode);
    } finally {
      this.snapshot.busy = false;
      this.notify();
    }
  }

  async loadMore() {
    if (
      this.snapshot.loadingMore ||
      !this.snapshot.hasMore ||
      this.snapshot.entries.length === 0
    ) {
      return;
    }
    if (this.offline && !this.offline.state.serverCursor) return;
    const cursor = this.offline
      ? this.offline.state.serverCursor
      : (() => {
          const last = this.snapshot.entries.at(-1)!;
          return {
            entryDate: last.entryDate,
            createdAt: last.createdAt,
            id: last.id,
          };
        })();
    this.snapshot.loadingMore = true;
    this.snapshot.paginationError = false;
    this.notify();
    try {
      const page = await this.gateway.list(cursor, 30);
      if (this.offline) {
        await this.offline.appendPage(page.items, page.nextCursor, page.hasMore);
        this.applyOfflineState();
        return;
      }
      const seen = new Set(this.snapshot.entries.map((entry) => entry.id));
      this.snapshot.entries = [
        ...this.snapshot.entries,
        ...page.items.filter((entry) => !seen.has(entry.id)),
      ];
      this.sortEntries();
      this.snapshot.hasMore = page.hasMore;
    } catch (error) {
      this.setError(error);
      this.snapshot.paginationError = true;
    } finally {
      this.snapshot.loadingMore = false;
      this.notify();
    }
  }

  async update(id: string, amount: number, entryDate: string) {
    const before = this.snapshot.entries.find((entry) => entry.id === id);
    if (!before || this.snapshot.busy) return;
    const optimistic = { ...before, amount: String(amount), entryDate };
    this.snapshot.busy = true;
    this.snapshot.errorCode = null;
    this.snapshot.conflictEntryId = null;
    this.snapshot.entries = this.snapshot.entries.map((entry) =>
      entry.id === id ? optimistic : entry,
    );
    this.sortEntries();
    this.applyAmount(before, before.amount, "subtract");
    this.applyAmount(optimistic, optimistic.amount, "add");
    this.notify();
    if (this.offline) {
      try {
        await this.offline.update(
          id,
          amount,
          entryDate,
          this.snapshot.summary,
        );
        this.applyOfflineState();
        void this.syncPending();
      } catch (error) {
        this.snapshot.entries = this.snapshot.entries.map((candidate) =>
          candidate.id === id ? before : candidate,
        );
        this.sortEntries();
        this.applyAmount(optimistic, optimistic.amount, "subtract");
        this.applyAmount(before, before.amount, "add");
        const errorCode = getEntriesErrorCode(error);
        this.snapshot.errorCode = errorCode;
        throw new Error(errorCode);
      } finally {
        this.snapshot.busy = false;
        this.notify();
      }
      return;
    }
    try {
      const entry = await this.gateway.update({
        id,
        amount,
        entryDate,
        expectedRevision: before.revision,
      });
      this.snapshot.entries = this.snapshot.entries.map((candidate) =>
        candidate.id === id ? entry : candidate,
      );
      this.sortEntries();
      await this.refreshSummary();
    } catch (error) {
      this.snapshot.entries = this.snapshot.entries.map((candidate) =>
        candidate.id === id ? before : candidate,
      );
      this.sortEntries();
      this.applyAmount(optimistic, optimistic.amount, "subtract");
      this.applyAmount(before, before.amount, "add");
      const errorCode = getEntriesErrorCode(error);
      this.snapshot.errorCode = errorCode;
      if (errorCode === "ENTRY_VERSION_CONFLICT") {
        this.snapshot.conflictEntryId = id;
      }
      throw new Error(errorCode);
    } finally {
      this.snapshot.busy = false;
      this.notify();
    }
  }

  async delete(id: string) {
    const before = this.snapshot.entries.find((entry) => entry.id === id);
    if (!before || this.snapshot.busy) return;
    const index = this.snapshot.entries.indexOf(before);
    this.snapshot.busy = true;
    this.snapshot.errorCode = null;
    this.snapshot.entries = this.snapshot.entries.filter((entry) => entry.id !== id);
    this.applyAmount(before, before.amount, "subtract");
    this.snapshot.viewState = this.snapshot.entries.length ? "content" : "empty";
    this.notify();
    if (this.offline) {
      try {
        await this.offline.delete(id, this.snapshot.summary);
        this.applyOfflineState();
        void this.syncPending();
      } catch (error) {
        this.snapshot.entries.splice(index, 0, before);
        this.applyAmount(before, before.amount, "add");
        this.snapshot.viewState = "content";
        const errorCode = getEntriesErrorCode(error);
        this.snapshot.errorCode = errorCode;
        throw new Error(errorCode);
      } finally {
        this.snapshot.busy = false;
        this.notify();
      }
      return;
    }
    try {
      await this.gateway.delete({ id, expectedRevision: before.revision });
      await this.refreshSummary();
    } catch (error) {
      this.snapshot.entries.splice(index, 0, before);
      this.applyAmount(before, before.amount, "add");
      this.snapshot.viewState = "content";
      const errorCode = getEntriesErrorCode(error);
      this.snapshot.errorCode = errorCode;
      if (errorCode === "ENTRY_VERSION_CONFLICT") {
        this.snapshot.conflictEntryId = id;
      }
      throw new Error(errorCode);
    } finally {
      this.snapshot.busy = false;
      this.notify();
    }
  }

  async setGoal(amount: number) {
    if (this.snapshot.busy) return;
    const before = { ...this.snapshot.summary };
    this.snapshot.busy = true;
    this.snapshot.errorCode = null;
    this.snapshot.summary.todayGoal = String(amount);
    this.notify();
    if (this.offline) {
      try {
        await this.offline.setGoal(
          amount,
          getPersonalDate(
            this.now(),
            this.snapshot.timeZone || this.fallbackTimeZone,
          ),
        );
        this.applyOfflineState();
        void this.syncPending();
      } catch (error) {
        this.snapshot.summary = before;
        const errorCode = getEntriesErrorCode(error);
        this.snapshot.errorCode = errorCode;
        throw new Error(errorCode);
      } finally {
        this.snapshot.busy = false;
        this.notify();
      }
      return;
    }
    try {
      await this.gateway.setGoal(
        amount,
        getPersonalDate(this.now(), this.snapshot.timeZone),
      );
      await this.refreshSummary();
    } catch (error) {
      this.snapshot.summary = before;
      const errorCode = getEntriesErrorCode(error);
      this.snapshot.errorCode = errorCode;
      throw new Error(errorCode);
    } finally {
      this.snapshot.busy = false;
      this.notify();
    }
  }

  async clearGoal() {
    if (this.snapshot.busy) return;
    const before = { ...this.snapshot.summary };
    this.snapshot.busy = true;
    this.snapshot.errorCode = null;
    this.snapshot.summary.todayGoal = null;
    this.notify();
    if (this.offline) {
      try {
        await this.offline.setGoal(
          null,
          getPersonalDate(
            this.now(),
            this.snapshot.timeZone || this.fallbackTimeZone,
          ),
        );
        this.applyOfflineState();
        void this.syncPending();
      } catch (error) {
        this.snapshot.summary = before;
        const errorCode = getEntriesErrorCode(error);
        this.snapshot.errorCode = errorCode;
        throw new Error(errorCode);
      } finally {
        this.snapshot.busy = false;
        this.notify();
      }
      return;
    }
    try {
      await this.gateway.setGoal(
        null,
        getPersonalDate(this.now(), this.snapshot.timeZone),
      );
      await this.refreshSummary();
    } catch (error) {
      this.snapshot.summary = before;
      const errorCode = getEntriesErrorCode(error);
      this.snapshot.errorCode = errorCode;
      throw new Error(errorCode);
    } finally {
      this.snapshot.busy = false;
      this.notify();
    }
  }

  setOnline(online: boolean) {
    if (this.snapshot.online === online) return;
    this.snapshot.online = online;
    if (this.offline) this.applyOfflineState();
    this.notify();
    if (online) void this.syncPending(true);
  }

  async syncPending(forcePendingNow = false) {
    if (!this.offline || !this.snapshot.online || this.syncing) return;
    this.syncing = true;
    try {
      await this.offline.sync(forcePendingNow);
      this.applyOfflineState();
    } catch (error) {
      this.setError(error);
      this.snapshot.syncState = "error";
    } finally {
      this.syncing = false;
      this.notify();
    }
  }

  async retrySync() {
    if (!this.offline) return;
    try {
      await this.offline.retryFailed();
      this.applyOfflineState();
    } catch (error) {
      this.setError(error);
      this.snapshot.syncState = "error";
    }
    this.notify();
  }

  async resetOfflineState() {
    if (
      !this.offline ||
      this.snapshot.offlineLoadErrorCode !== "INVALID_OFFLINE_STATE" ||
      this.snapshot.busy
    ) {
      return;
    }
    this.snapshot.busy = true;
    this.notify();
    try {
      await this.offline.reset();
      this.applyOfflineState();
      await this.load();
    } catch {
      this.snapshot.offlineLoadErrorCode = "INVALID_OFFLINE_STATE";
      this.snapshot.errorCode = "INVALID_OFFLINE_STATE";
      this.snapshot.viewState = "error";
    } finally {
      this.snapshot.busy = false;
      this.notify();
    }
  }

  async retryOfflineLoad() {
    if (
      !this.offline ||
      this.snapshot.offlineLoadErrorCode !== "INTERNAL" ||
      this.snapshot.busy
    ) {
      return;
    }
    this.snapshot.busy = true;
    this.notify();
    try {
      await this.load();
    } finally {
      this.snapshot.busy = false;
      this.notify();
    }
  }

  async keepServerVersion(entryId?: string) {
    if (!this.offline) return;
    try {
      await this.offline.keepServerVersion(entryId);
      this.applyOfflineState();
    } catch (error) {
      this.setError(error);
      this.snapshot.syncState = "error";
    }
    this.notify();
  }

  async reapplyConflict(entryId?: string) {
    if (!this.offline) return;
    try {
      await this.offline.reapplyConflict(entryId);
      this.applyOfflineState();
    } catch (error) {
      this.setError(error);
      this.snapshot.syncState = "error";
    }
    this.notify();
  }
}
