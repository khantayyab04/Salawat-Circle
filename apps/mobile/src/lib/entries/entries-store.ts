import { getPersonalDate, getWeekStart } from "./calendar";
import { getEntriesErrorCode, type EntriesErrorCode } from "./errors";
import type { EntriesGateway, Entry, EntrySummary } from "./entries-gateway";
import { addTotal, subtractTotal } from "./totals";

export type EntriesViewState = "loading" | "content" | "empty" | "error";

export class EntriesStore {
  readonly snapshot = {
    viewState: "loading" as EntriesViewState,
    entries: [] as Entry[],
    summary: {
      todayTotal: "0",
      weekTotal: "0",
      allTimeTotal: "0",
    } as EntrySummary,
    timeZone: "",
    hasMore: false,
    loadingMore: false,
    paginationError: false,
    busy: false,
    errorCode: null as EntriesErrorCode | null,
    conflictEntryId: null as string | null,
  };

  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly gateway: EntriesGateway,
    private readonly fallbackTimeZone: string,
    private readonly now: () => Date,
    private readonly createId: () => string,
  ) {}

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
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

  async load() {
    this.snapshot.viewState = "loading";
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
      this.snapshot.summary = summary;
      const loadedIds = new Set(page.items.map((entry) => entry.id));
      this.snapshot.entries = [
        ...page.items,
        ...this.snapshot.entries.filter((entry) => !loadedIds.has(entry.id)),
      ];
      this.sortEntries();
      this.snapshot.hasMore = page.hasMore;
      this.snapshot.viewState = page.items.length ? "content" : "empty";
    } catch (error) {
      this.setError(error);
      this.snapshot.viewState = "error";
    }
    this.notify();
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
    const optimistic: Entry = {
      id: this.createId(),
      amount: String(amount),
      entryDate: getPersonalDate(
        new Date(recordedAtClient),
        this.snapshot.timeZone,
      ),
      timezone: this.snapshot.timeZone,
      recordedAtClient,
      createdAt: recordedAtClient,
      updatedAt: recordedAtClient,
      revision: 0,
    };
    this.snapshot.busy = true;
    this.snapshot.errorCode = null;
    this.snapshot.entries = [optimistic, ...this.snapshot.entries];
    this.sortEntries();
    this.applyAmount(optimistic, optimistic.amount, "add");
    this.snapshot.viewState = "content";
    this.notify();
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
    const last = this.snapshot.entries.at(-1)!;
    this.snapshot.loadingMore = true;
    this.snapshot.paginationError = false;
    this.notify();
    try {
      const page = await this.gateway.list(
        {
          entryDate: last.entryDate,
          createdAt: last.createdAt,
          id: last.id,
        },
        30,
      );
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
}
