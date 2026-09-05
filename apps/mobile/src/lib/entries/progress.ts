export type ProgressEntry = {
  id: string;
  amount: string;
  entryDate: string;
};

export type DailyProgress = {
  date: string;
  total: string;
  entryCount: number;
};

export function buildDailyProgress(
  entries: readonly ProgressEntry[],
): DailyProgress[] {
  const days = new Map<string, DailyProgress>();
  for (const entry of entries) {
    const current = days.get(entry.entryDate) ?? {
      date: entry.entryDate,
      total: "0",
      entryCount: 0,
    };
    days.set(entry.entryDate, {
      ...current,
      total: (BigInt(current.total) + BigInt(entry.amount)).toString(),
      entryCount: current.entryCount + 1,
    });
  }
  return [...days.values()].sort((first, second) =>
    second.date.localeCompare(first.date),
  );
}
