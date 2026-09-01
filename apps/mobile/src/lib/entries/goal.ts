import { parseEntryAmount } from "./amount";

export function parseGoalAmount(value: string) {
  return parseEntryAmount(value);
}

export function describeGoalProgress(
  achievedDays: string,
  eligibleDays: string,
) {
  if (BigInt(eligibleDays) === 0n) return null;
  return { achievedDays, eligibleDays };
}
