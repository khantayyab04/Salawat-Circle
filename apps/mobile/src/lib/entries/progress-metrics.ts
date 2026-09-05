type DayTotal = { date: string; total: string };

function previousDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function calculateStreaks(days: readonly DayTotal[]) {
  let current = 0;
  let longest = 0;
  let running = 0;
  let expectedDate: string | null = null;
  let currentOpen = true;
  for (const day of [...days].sort((first, second) =>
    second.date.localeCompare(first.date),
  )) {
    const active = BigInt(day.total) > 0n;
    const contiguous = expectedDate === null || day.date === expectedDate;
    if (active && contiguous) {
      running += 1;
    } else {
      running = 0;
    }
    if (currentOpen && active && contiguous) {
      current += 1;
    } else {
      currentOpen = false;
    }
    longest = Math.max(longest, running);
    expectedDate = previousDate(day.date);
  }
  return { current, longest };
}

export function calculateWeekDelta(
  current: readonly string[],
  previous: readonly string[],
) {
  const currentTotal = current.reduce((sum, value) => sum + Number(value), 0);
  const previousTotal = previous.reduce((sum, value) => sum + Number(value), 0);
  if (previousTotal === 0) return null;
  return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
}

export function calculateGoalRate(
  days: readonly { goal: string | null; total: string }[],
) {
  const eligible = days.filter((day) => day.goal !== null);
  return {
    achieved: eligible.filter((day) => BigInt(day.total) >= BigInt(day.goal!))
      .length,
    eligible: eligible.length,
  };
}

const milestones = [1_000, 10_000, 50_000, 100_000, 250_000, 500_000] as const;

export function describeMilestone(total: string) {
  const value = BigInt(total);
  const next = milestones.find((milestone) => value < milestone) ?? milestones.at(-1)!;
  const reached = [...milestones]
    .reverse()
    .find((milestone) => value >= milestone) ?? 0;
  return {
    reached: String(reached),
    next: String(next),
    progress: Math.min(100, Math.floor((Number(value) / next) * 100)),
  };
}
