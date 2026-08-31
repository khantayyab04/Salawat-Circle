import { describe, expect, it } from "vitest";
import {
  parseDisplayName,
  parseEmail,
  parseOtp,
  parseTimeZone,
} from "./validation";

describe("MVP03 auth validation", () => {
  it("normalizes valid auth input and rejects invalid boundaries", () => {
    expect(parseEmail("  PERSON@Example.COM ")).toBe("person@example.com");
    expect(() => parseEmail("not-an-email")).toThrow();

    expect(parseOtp("123456")).toBe("123456");
    expect(() => parseOtp("12345a")).toThrow();

    expect(parseDisplayName("  Jules   Example  ")).toBe("Jules Example");
    expect(() => parseDisplayName("x")).toThrow();
    expect(() => parseDisplayName("x".repeat(31))).toThrow();

    expect(parseTimeZone("Europe/Berlin")).toBe("Europe/Berlin");
    expect(() => parseTimeZone("UTC+2")).toThrow();
  });
});
