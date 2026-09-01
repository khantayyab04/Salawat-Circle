const ERROR_CODES = new Set([
  "AUTH_REQUIRED",
  "CONSENT_REQUIRED",
  "NOT_FOUND",
  "INVALID_INPUT",
  "INVALID_AMOUNT",
  "INVALID_DATE",
  "ENTRY_VERSION_CONFLICT",
  "RATE_LIMITED",
]);

export type EntriesErrorCode = (typeof ERROR_CODES extends Set<infer Code>
  ? Code
  : never) | "INTERNAL";

export function getEntriesErrorCode(error: unknown): EntriesErrorCode {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";
  return ERROR_CODES.has(message) ? (message as EntriesErrorCode) : "INTERNAL";
}
