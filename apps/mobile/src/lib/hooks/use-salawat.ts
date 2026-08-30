import { useCallback, useEffect, useState } from "react";
import { localDb } from "../storage/local-db";
import {
  calculateHomeSummary,
  createSalawatEntry,
  deleteSalawatEntry,
  resolveEntryConflict,
  setDailyGoal,
  updateSalawatEntry,
} from "../storage/sync-engine";
import type { HomeSummaryData, LocalSalawatEntry } from "../storage/types";

export type SalawatCursor = {
  entry_date: string;
  created_at: string;
  id: string;
} | null;

export function useSalawatSummary(targetDate: string) {
  const [summary, setSummary] = useState<HomeSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await calculateHomeSummary(targetDate);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Übersicht.");
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    let active = true;
    calculateHomeSummary(targetDate)
      .then((data) => {
        if (active) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Fehler beim Laden.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [targetDate]);

  return { summary, loading, error, refresh };
}

export function useSalawatEntries(pageSize = 30) {
  const [entries, setEntries] = useState<LocalSalawatEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<SalawatCursor>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const all = await localDb.getAllEntries();
      const active = all.filter((e) => e.local_state !== "pending_delete");
      const visible = active.slice(0, pageSize);
      setEntries(visible);
      setHasMore(active.length > pageSize);
      if (visible.length > 0) {
        const last = visible[visible.length - 1];
        setCursor({
          entry_date: last.entry_date,
          created_at: last.created_at,
          id: last.id,
        });
      } else {
        setCursor(null);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor) return;
    try {
      const all = await localDb.getAllEntries();
      const active = all.filter((e) => e.local_state !== "pending_delete");

      const afterCursor = active.filter((e) => {
        if (e.entry_date < cursor.entry_date) return true;
        if (e.entry_date > cursor.entry_date) return false;
        if (e.created_at < cursor.created_at) return true;
        if (e.created_at > cursor.created_at) return false;
        return e.id < cursor.id;
      });

      const nextPage = afterCursor.slice(0, pageSize);
      setEntries((prev) => [...prev, ...nextPage]);
      setHasMore(afterCursor.length > pageSize);
      if (nextPage.length > 0) {
        const last = nextPage[nextPage.length - 1];
        setCursor({
          entry_date: last.entry_date,
          created_at: last.created_at,
          id: last.id,
        });
      }
    } catch {
      // ignore
    }
  }, [cursor, hasMore, pageSize]);

  useEffect(() => {
    let active = true;
    localDb.getAllEntries().then((all) => {
      if (active) {
        const filtered = all.filter((e) => e.local_state !== "pending_delete");
        const visible = filtered.slice(0, pageSize);
        setEntries(visible);
        setHasMore(filtered.length > pageSize);
        if (visible.length > 0) {
          const last = visible[visible.length - 1];
          setCursor({
            entry_date: last.entry_date,
            created_at: last.created_at,
            id: last.id,
          });
        }
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [pageSize]);

  return { entries, hasMore, loadMore, loading, refresh, cursor };
}

export function useSalawatActions(onSuccess?: () => void) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const addEntry = useCallback(
    async (amount: number, date: string, timezone: string) => {
      try {
        setActionLoading(true);
        setActionError(null);
        const created = await createSalawatEntry({
          amount,
          entry_date: date,
          timezone,
        });
        onSuccess?.();
        return created;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Eintrag konnte nicht gespeichert werden.";
        setActionError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [onSuccess],
  );

  const updateEntry = useCallback(
    async (id: string, amount: number, date: string) => {
      try {
        setActionLoading(true);
        setActionError(null);
        const updated = await updateSalawatEntry({ id, amount, entry_date: date });
        onSuccess?.();
        return updated;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Änderung konnte nicht gespeichert werden.";
        setActionError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [onSuccess],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      try {
        setActionLoading(true);
        setActionError(null);
        await deleteSalawatEntry(id);
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Löschen fehlgeschlagen.";
        setActionError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [onSuccess],
  );

  const setGoal = useCallback(
    async (effectiveFrom: string, amount: number | null) => {
      try {
        setActionLoading(true);
        setActionError(null);
        await setDailyGoal({ effective_from: effectiveFrom, amount });
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tagesziel konnte nicht gespeichert werden.";
        setActionError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [onSuccess],
  );

  const resolveConflict = useCallback(
    async (id: string, choice: "keep_server" | "reapply_mine") => {
      try {
        setActionLoading(true);
        setActionError(null);
        await resolveEntryConflict(id, choice);
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Konfliktlösung fehlgeschlagen.";
        setActionError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [onSuccess],
  );

  return {
    addEntry,
    updateEntry,
    removeEntry,
    setGoal,
    resolveConflict,
    actionLoading,
    actionError,
  };
}
