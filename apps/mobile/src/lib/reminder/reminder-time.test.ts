import { describe, expect, it } from "vitest";
import {
  fromPickerDate,
  parseReminderTime,
  toPickerDate,
} from "./reminder-time";

describe("reminder time", () => {
  it("accepts a daily wall-clock time and preserves it through picker conversion", () => {
    const time = parseReminderTime({ hour: 7, minute: 5 });

    expect(time).toEqual({ hour: 7, minute: 5 });
    expect(fromPickerDate(toPickerDate(time))).toEqual(time);
  });

  it.each([
    [{ hour: -1, minute: 0 }],
    [{ hour: 24, minute: 0 }],
    [{ hour: 10, minute: -1 }],
    [{ hour: 10, minute: 60 }],
    [{ hour: 10.5, minute: 0 }],
  ])("rejects an invalid daily wall-clock time: %o", (value) => {
    expect(() => parseReminderTime(value)).toThrow("INVALID_REMINDER_TIME");
  });
});
