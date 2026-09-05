import { describe, expect, test } from "vitest";
import * as entries from "./tally";

const tally = entries as typeof entries & {
  createTally?: (amount?: number) => { amount: number; limitReached: boolean };
  addTallyAmount?: (
    current: { amount: number; limitReached: boolean },
    amount: number,
  ) => { amount: number; limitReached: boolean };
  resetTally?: (current: {
    amount: number;
    limitReached: boolean;
  }) => { amount: number; limitReached: boolean };
};

describe("tally staging", () => {
  test("accumulates quick-add amounts before the entry is committed", () => {
    expect(tally.createTally).toBeTypeOf("function");
    expect(tally.addTallyAmount).toBeTypeOf("function");
    const staged = tally.addTallyAmount!(
      tally.addTallyAmount!(tally.createTally!(), 100),
      200,
    );

    expect(staged.amount).toBe(300);
  });

  test("rejects a quick-add amount that would exceed the entry limit", () => {
    const staged = tally.addTallyAmount!(tally.createTally!(9_999_900), 200);

    expect(staged).toEqual({ amount: 9_999_900, limitReached: true });
  });

  test("clears a staged amount without affecting an already saved entry", () => {
    expect(tally.resetTally!(tally.createTally!(500))).toEqual({
      amount: 0,
      limitReached: false,
    });
  });
});
