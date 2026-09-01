import { describe, expect, it } from "vitest";
import {
  buildInviteLink,
  normalizeManualInviteCode,
  normalizeTokenInvite,
  parseInviteSecretParam,
} from "./invite-link";

describe("normalizeTokenInvite", () => {
  it("trims whitespace and accepts only 43-char URL-safe unpadded base64 tokens", () => {
    expect(
      normalizeTokenInvite(
        "  AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA  ",
      ),
    ).toBe("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  });

  it("rejects malformed, padded, and oversized tokens", () => {
    expect(normalizeTokenInvite("A".repeat(44))).toBeNull();
    expect(normalizeTokenInvite("A".repeat(42))).toBeNull();
    expect(
      normalizeTokenInvite("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="),
    ).toBeNull();
    expect(
      normalizeTokenInvite("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+"),
    ).toBeNull();
  });
});

describe("normalizeManualInviteCode", () => {
  it("normalizes human separators and uppercases valid codes", () => {
    expect(normalizeManualInviteCode("  abcd-2345 ef  ")).toBe("ABCD2345EF");
  });

  it("rejects ambiguous and invalid characters", () => {
    expect(normalizeManualInviteCode("ABCDI234EF")).toBeNull();
    expect(normalizeManualInviteCode("ABCDO234EF")).toBeNull();
    expect(normalizeManualInviteCode("ABCD1234EF")).toBeNull();
    expect(normalizeManualInviteCode("ABCD2345E")).toBeNull();
  });
});

describe("parseInviteSecretParam", () => {
  it("classifies a valid token route/search param", () => {
    expect(
      parseInviteSecretParam(
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ),
    ).toEqual({
      kind: "token",
      secret: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    });
  });

  it("classifies a valid manual code route/search param", () => {
    expect(parseInviteSecretParam(" abcd-2345 ef ")).toEqual({
      kind: "code",
      secret: "ABCD2345EF",
    });
  });

  it("handles array params defensively", () => {
    expect(
      parseInviteSecretParam([
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ]),
    ).toEqual({
      kind: "token",
      secret: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    });
    expect(
      parseInviteSecretParam([
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      ]),
    ).toBeNull();
  });

  it("returns null for invalid or missing params", () => {
    expect(parseInviteSecretParam(undefined)).toBeNull();
    expect(parseInviteSecretParam("")).toBeNull();
    expect(parseInviteSecretParam("abc")).toBeNull();
  });
});

describe("buildInviteLink", () => {
  const token = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  it("builds a join link for a valid https origin base", () => {
    expect(buildInviteLink(token, "https://example.com")).toBe(
      "https://example.com/join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
  });

  it("keeps base paths and strips trailing slashes", () => {
    expect(buildInviteLink(token, "https://example.com/app/")).toBe(
      "https://example.com/app/join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
  });

  it("falls back to scheme links on invalid or malicious base urls", () => {
    expect(buildInviteLink(token, "http://example.com")).toBe(
      "salawat-circle://join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    expect(buildInviteLink(token, "javascript:alert(1)")).toBe(
      "salawat-circle://join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    expect(buildInviteLink(token, "https://user:pass@example.com")).toBe(
      "salawat-circle://join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    expect(buildInviteLink(token, "https://example.com/path?x=1#frag")).toBe(
      "salawat-circle://join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
  });

  it("falls back to scheme links when no configured base exists", () => {
    expect(buildInviteLink(token)).toBe(
      "salawat-circle://join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    expect(buildInviteLink(token, "   ")).toBe(
      "salawat-circle://join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
  });

  it("rejects malformed token input", () => {
    expect(() => buildInviteLink("invalid-token")).toThrowError(
      "INVALID_INVITE_TOKEN",
    );
  });
});
