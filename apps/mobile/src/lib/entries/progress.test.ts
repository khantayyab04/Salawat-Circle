import { describe, expect, test } from "vitest";
import * as progress from "./progress";

const buildDailyProgress = progress as typeof progress & {
  buildDailyProgress?: (
    entries: readonly {
      id: string;
      amount: string;
      entryDate: string;
    }[],
  ) => { date: string; total: string; entryCount: number }[];
};

describe("daily progress", () => {
  test("groups individual entries by day while preserving their full total", () => {
    expect(buildDailyProgress.buildDailyProgress).toBeTypeOf("function");
    expect(
      buildDailyProgress.buildDailyProgress?.([
        { id: "1", amount: "100", entryDate: "2026-09-02" },
        { id: "2", amount: "25", entryDate: "2026-09-02" },
        { id: "3", amount: "75", entryDate: "2026-09-01" },
      ]),
    ).toEqual([
      { date: "2026-09-02", total: "125", entryCount: 2 },
      { date: "2026-09-01", total: "75", entryCount: 1 },
    ]);
  });
});
