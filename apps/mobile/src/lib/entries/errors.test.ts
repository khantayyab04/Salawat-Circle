import { describe, expect, it } from "vitest";
import { getEntriesErrorCode } from "./errors";

describe("getEntriesErrorCode", () => {
  it.each([
    "AUTH_REQUIRED",
    "CONSENT_REQUIRED",
    "NOT_FOUND",
    "INVALID_INPUT",
    "INVALID_AMOUNT",
    "INVALID_DATE",
    "ENTRY_VERSION_CONFLICT",
    "RATE_LIMITED",
  ])("preserves stable backend error code %s", (code) => {
    expect(getEntriesErrorCode({ message: code })).toBe(code);
  });

  it("does not expose an unknown backend error detail", () => {
    expect(
      getEntriesErrorCode({ message: "duplicate key reveals internal detail" }),
    ).toBe("INTERNAL");
  });

  it("normalizes HTTP authentication and rate-limit failures", () => {
    expect(getEntriesErrorCode({ status: 401, message: "JWT expired" })).toBe(
      "AUTH_REQUIRED",
    );
    expect(getEntriesErrorCode({ status: 429, message: "too many requests" })).toBe(
      "RATE_LIMITED",
    );
    expect(getEntriesErrorCode({ status: 403, message: "denied" })).toBe(
      "FORBIDDEN",
    );
    expect(getEntriesErrorCode({ status: 422, message: "invalid" })).toBe(
      "INVALID_INPUT",
    );
  });

  it("preserves a known PostgREST domain code before its HTTP 400 status", () => {
    expect(
      getEntriesErrorCode({
        status: 400,
        message: "ENTRY_VERSION_CONFLICT",
      }),
    ).toBe("ENTRY_VERSION_CONFLICT");
    expect(
      getEntriesErrorCode({ status: 400, message: "CONSENT_REQUIRED" }),
    ).toBe("CONSENT_REQUIRED");
  });
});
