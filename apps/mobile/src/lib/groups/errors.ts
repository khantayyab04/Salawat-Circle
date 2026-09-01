const DOMAIN_ERROR_CODES = new Set([
  "AUTH_REQUIRED",
  "CONSENT_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "NAME_REJECTED",
  "GROUP_LIMIT_REACHED",
  "ENTRY_VERSION_CONFLICT",
  "INVITE_INVALID",
  "RATE_LIMITED",
  "OWNER_MUST_TRANSFER",
]);

export type GroupsDomainErrorCode = typeof DOMAIN_ERROR_CODES extends Set<infer Code>
  ? Code
  : never;

export type GroupsErrorCode =
  | GroupsDomainErrorCode
  | "OFFLINE"
  | "INTERNAL"
  | "INVALID_RESPONSE"
  | "NETWORK";

export class GroupsError extends Error {
  readonly code: GroupsErrorCode;

  constructor(code: GroupsErrorCode) {
    super(code);
    this.name = "GroupsError";
    this.code = code;
  }
}

function readMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}

function readStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return null;
}

function readPostgrestCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return "";
}

export function getGroupsErrorCode(error: unknown): GroupsErrorCode {
  const message = readMessage(error);
  if (message === "OFFLINE") {
    return "OFFLINE";
  }

  if (DOMAIN_ERROR_CODES.has(message)) {
    return message as GroupsDomainErrorCode;
  }

  if (readPostgrestCode(error) === "P0001") {
    return "INTERNAL";
  }

  const status = readStatus(error);
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 429) return "RATE_LIMITED";
  if (status === 403) return "FORBIDDEN";
  if (status === 400 || status === 422) return "INVALID_INPUT";
  return "INTERNAL";
}

export function toGroupsError(error: unknown): GroupsError {
  if (error instanceof GroupsError) {
    return error;
  }

  return new GroupsError(getGroupsErrorCode(error));
}
