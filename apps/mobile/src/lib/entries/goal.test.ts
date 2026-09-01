import { describe, expect, it } from "vitest";
import { describeGoalProgress, parseGoalAmount } from "./goal";

describe("parseGoalAmount", () => {
  it.each([
    ["1", 1],
    ["00042", 42],
    ["10.000.000", 10_000_000],
  ])("accepts %s as %i", (input, expected) => {
    expect(parseGoalAmount(input)).toBe(expected);
  });

  it.each(["", "0", "10.000.001", "-1", "1.5", "1e3"])(
    "rejects invalid goal amount %j",
    (input) => {
      expect(() => parseGoalAmount(input)).toThrow("INVALID_AMOUNT");
    },
  );
});

describe("describeGoalProgress", () => {
  it("shows achieved and eligible weekly goal days", () => {
    expect(describeGoalProgress("2", "4")).toEqual({
      achievedDays: "2",
      eligibleDays: "4",
    });
  });

  it("does not represent missing goal days as 0/0", () => {
    expect(describeGoalProgress("0", "0")).toBeNull();
  });
});
