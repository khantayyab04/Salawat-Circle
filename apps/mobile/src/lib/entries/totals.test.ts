import { describe, expect, it } from "vitest";
import { addTotal, subtractTotal, totalFromAmounts } from "./totals";

describe("entry totals", () => {
  it("adds server decimal strings without losing precision", () => {
    expect(addTotal("9007199254740993", "7")).toBe("9007199254741000");
  });

  it("subtracts a removed entry without using floating point arithmetic", () => {
    expect(subtractTotal("10000000000000001", "2")).toBe("9999999999999999");
  });

  it("sums a collection of entry amounts exactly", () => {
    expect(totalFromAmounts(["10000000", "2", "9007199254740993"])).toBe(
      "9007199264740995",
    );
  });
});
