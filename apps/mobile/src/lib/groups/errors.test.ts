import { describe, expect, it } from "vitest";
import { GroupsError, getGroupsErrorCode } from "./errors";

describe("getGroupsErrorCode", () => {
  it.each([
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
    "OFFLINE",
  ])("preserves stable backend domain error code %s", (code) => {
    expect(getGroupsErrorCode({ message: code })).toBe(code);
  });

  it("does not expose unknown backend message details", () => {
    expect(getGroupsErrorCode({ message: "relation private.group_invites missing" })).toBe(
      "INTERNAL",
    );
  });

  it("maps HTTP status fallbacks when no known domain message is present", () => {
    expect(getGroupsErrorCode({ status: 401, message: "JWT expired" })).toBe(
      "AUTH_REQUIRED",
    );
    expect(getGroupsErrorCode({ status: 429, message: "too many requests" })).toBe(
      "RATE_LIMITED",
    );
    expect(getGroupsErrorCode({ status: 403, message: "denied" })).toBe("FORBIDDEN");
    expect(getGroupsErrorCode({ status: 422, message: "invalid" })).toBe("INVALID_INPUT");
  });

  it("prioritizes known P0001 domain codes before HTTP status", () => {
    expect(
      getGroupsErrorCode({
        code: "P0001",
        message: "ENTRY_VERSION_CONFLICT",
        status: 400,
      }),
    ).toBe("ENTRY_VERSION_CONFLICT");
  });

  it("treats unknown P0001 message as internal without falling back to HTTP status", () => {
    expect(
      getGroupsErrorCode({ code: "P0001", message: "opaque_internal_reason", status: 400 }),
    ).toBe("INTERNAL");
  });
});

describe("GroupsError", () => {
  it("keeps network and invalid response failures as typed domain errors", () => {
    expect(new GroupsError("NETWORK").code).toBe("NETWORK");
    expect(new GroupsError("INVALID_RESPONSE").message).toBe("INVALID_RESPONSE");
    expect(new GroupsError("OFFLINE").code).toBe("OFFLINE");
  });
});
