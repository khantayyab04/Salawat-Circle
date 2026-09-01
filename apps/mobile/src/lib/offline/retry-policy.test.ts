import { describe, expect, it } from "vitest";
import { classifySyncError, retryAt } from "./retry-policy";

describe("sync retry policy", () => {
  it("classifies retryable, terminal, auth and conflict failures", () => {
    expect(classifySyncError("INTERNAL")).toBe("retry");
    expect(classifySyncError("RATE_LIMITED")).toBe("retry");
    expect(classifySyncError("AUTH_REQUIRED")).toBe("auth");
    expect(classifySyncError("ENTRY_VERSION_CONFLICT")).toBe("conflict");
    expect(classifySyncError("INVALID_AMOUNT")).toBe("terminal");
    expect(classifySyncError("NOT_FOUND")).toBe("terminal");
  });

  it("uses capped exponential backoff with bounded jitter", () => {
    const now = new Date("2026-08-31T10:00:00.000Z");

    expect(retryAt(now, 1, () => 0).toISOString()).toBe(
      "2026-08-31T10:00:01.000Z",
    );
    expect(retryAt(now, 2, () => 1).toISOString()).toBe(
      "2026-08-31T10:00:02.500Z",
    );
    expect(retryAt(now, 99, () => 1).toISOString()).toBe(
      "2026-08-31T10:05:00.000Z",
    );
  });
});
