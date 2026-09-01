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
});
