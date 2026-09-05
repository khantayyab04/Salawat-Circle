import { expect, test } from "vitest";
import { tabSymbols } from "./navigation-symbols";

test("uses a distinct but familiar Today symbol during Jumuah", () => {
  expect(tabSymbols(true).today).toBe("sparkles");
  expect(tabSymbols(false).today).toBe("calendar");
});
