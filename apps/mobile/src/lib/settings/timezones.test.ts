import { describe, expect, it } from "vitest";
import { getTimeZoneOptions } from "./timezones";

describe("timezone options", () => {
  it("keeps the detected and saved zones available alongside curated choices", () => {
    const options = getTimeZoneOptions("Pacific/Auckland", "Asia/Kolkata");

    expect(options).toContain("Pacific/Auckland");
    expect(options).toContain("Asia/Kolkata");
    expect(options).toContain("Europe/Berlin");
  });

  it("drops invalid zones instead of offering unusable settings", () => {
    expect(getTimeZoneOptions("Invalid/Zone", "Europe/Berlin")).not.toContain(
      "Invalid/Zone",
    );
  });
});
