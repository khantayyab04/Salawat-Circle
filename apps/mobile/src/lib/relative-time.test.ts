import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/relative-time";

const now = new Date("2026-09-05T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("treats the last minute as just now", () => {
    expect(
      formatRelativeTime("2026-09-05T11:59:30.000Z", now, {
        justNow: "just now",
        minutes: "%{count}m ago",
        hours: "%{count}h ago",
        days: "%{count}d ago",
      }),
    ).toBe("just now");
  });

  it("reports whole minutes", () => {
    expect(
      formatRelativeTime("2026-09-05T11:58:00.000Z", now, {
        justNow: "just now",
        minutes: "%{count}m ago",
        hours: "%{count}h ago",
        days: "%{count}d ago",
      }),
    ).toBe("2m ago");
  });

  it("switches to hours after an hour", () => {
    expect(
      formatRelativeTime("2026-09-05T09:00:00.000Z", now, {
        justNow: "just now",
        minutes: "%{count}m ago",
        hours: "%{count}h ago",
        days: "%{count}d ago",
      }),
    ).toBe("3h ago");
  });

  it("switches to days after a day", () => {
    expect(
      formatRelativeTime("2026-09-02T12:00:00.000Z", now, {
        justNow: "just now",
        minutes: "%{count}m ago",
        hours: "%{count}h ago",
        days: "%{count}d ago",
      }),
    ).toBe("3d ago");
  });

  it("never reports a future timestamp as elapsed", () => {
    expect(
      formatRelativeTime("2026-09-05T12:05:00.000Z", now, {
        justNow: "just now",
        minutes: "%{count}m ago",
        hours: "%{count}h ago",
        days: "%{count}d ago",
      }),
    ).toBe("just now");
  });

  it("returns null for a value that is not a timestamp", () => {
    expect(
      formatRelativeTime("not-a-date", now, {
        justNow: "just now",
        minutes: "%{count}m ago",
        hours: "%{count}h ago",
        days: "%{count}d ago",
      }),
    ).toBeNull();
  });
});
