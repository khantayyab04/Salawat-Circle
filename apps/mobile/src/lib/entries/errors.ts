const ERROR_CODES = new Set([
  "AUTH_REQUIRED",
  "CONSENT_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "INVALID_AMOUNT",
  "INVALID_DATE",
  "INVALID_OFFLINE_STATE",
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
  if (ERROR_CODES.has(message)) return message as EntriesErrorCode;
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : null;
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 429) return "RATE_LIMITED";
  if (status === 403) return "FORBIDDEN";
  if (status === 400 || status === 422) return "INVALID_INPUT";
  return "INTERNAL";
}
