import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson } from "./local-crypto";

const key = new Uint8Array(32).fill(7);

describe("local crypto", () => {
  it("round-trips JSON with a fresh nonce for every encryption", () => {
    const first = encryptJson({ amount: "42" }, key, () =>
      new Uint8Array(12).fill(1),
    );
    const second = encryptJson({ amount: "42" }, key, () =>
      new Uint8Array(12).fill(2),
    );

    expect(first).not.toBe(second);
    expect(decryptJson(first, key)).toEqual({ amount: "42" });
    expect(decryptJson(second, key)).toEqual({ amount: "42" });
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptJson({ amount: "42" }, key, () =>
      new Uint8Array(12).fill(1),
    );
    const tampered = `${encrypted.slice(0, -1)}${
      encrypted.endsWith("0") ? "1" : "0"
    }`;

    expect(() => decryptJson(tampered, key)).toThrow();
  });

  it("does not decrypt with another account key", () => {
    const encrypted = encryptJson({ amount: "42" }, key, () =>
      new Uint8Array(12).fill(1),
    );

    expect(() => decryptJson(encrypted, new Uint8Array(32).fill(8))).toThrow();
  });
});
