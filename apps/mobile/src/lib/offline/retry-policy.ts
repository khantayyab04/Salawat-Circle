import type { EntriesErrorCode } from "@/lib/entries/errors";

export type SyncFailureKind = "retry" | "terminal" | "auth" | "conflict";

export function classifySyncError(code: EntriesErrorCode): SyncFailureKind {
  if (code === "ENTRY_VERSION_CONFLICT") return "conflict";
  if (code === "AUTH_REQUIRED") return "auth";
  if (code === "INTERNAL" || code === "RATE_LIMITED") return "retry";
  return "terminal";
}

export function retryAt(
  now: Date,
  retryCount: number,
  random: () => number = Math.random,
) {
  const exponent = Math.max(0, retryCount - 1);
  const baseDelay = Math.min(240_000, 1_000 * 2 ** exponent);
  const delay = Math.min(300_000, baseDelay + baseDelay * 0.25 * random());
  return new Date(now.getTime() + delay);
}
