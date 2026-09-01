import { describe, expect, it } from "vitest";
import { parseEntryAmount } from "./amount";

describe("parseEntryAmount", () => {
  it.each([
    ["1", 1],
    ["00042", 42],
    ["10.000.000", 10_000_000],
    ["10,000,000", 10_000_000],
  ])("accepts %s as %i", (input, expected) => {
    expect(parseEntryAmount(input)).toBe(expected);
  });

  it.each(["", " ", "0", "10.000.001", "-1", "1.5", "1e3", ".", ","])(
    "rejects invalid amount %j",
    (input) => {
      expect(() => parseEntryAmount(input)).toThrow("INVALID_AMOUNT");
    },
  );
});
