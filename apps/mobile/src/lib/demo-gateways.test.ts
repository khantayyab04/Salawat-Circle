import { describe, expect, test } from "vitest";
import * as demo from "./demo-gateways";

describe("local UI demo gateways", () => {
  test("provide a populated personal summary and day history", async () => {
    expect(demo.createDemoEntriesGateway).toBeTypeOf("function");
    const gateway = demo.createDemoEntriesGateway!();

    expect(await gateway.getSummary("Europe/Berlin")).toMatchObject({
      todayTotal: "1333",
      todayGoal: "1500",
    });
    expect((await gateway.list(null, 50)).items).toHaveLength(8);
  });

  test("provide groups with a visible personal rank", async () => {
    expect(demo.createDemoGroupsGateway).toBeTypeOf("function");
    const gateway = demo.createDemoGroupsGateway!();

    expect(await gateway.listMyGroups()).toEqual({
      items: expect.arrayContaining([
        expect.objectContaining({ name: "Freitagskreis", ownRank: 2 }),
      ]),
    });
  });

  test("provides collective group insights through the gateway method", async () => {
    const gateway = demo.createDemoGroupsGateway();

    await expect(gateway.getInsights?.("familienkreis")).resolves.toMatchObject({
      groupId: "familienkreis",
      remaining: "6500",
    });
  });
});

 test("demo monthly edits persist calendar bounds and derive a weekly goal", async () => {
    const gateway = demo.createDemoGroupsGateway();
    await gateway.setGroupGoal!("familienkreis", "month", 3000, 7, { mode: "custom", startDate: "2026-09-01" });
    expect(await gateway.getInsights!("familienkreis", "month")).toMatchObject({ goalAmount: "3000", campaign: { mode: "custom", startDate: "2026-09-01", endDate: "2026-09-30" } });
    expect(await gateway.getInsights!("familienkreis", "week")).toMatchObject({ goalAmount: "600", goalSource: "campaign" });
    await gateway.setGroupGoal!("familienkreis", "week", 777, 8);
    expect(await gateway.getInsights!("familienkreis", "week")).toMatchObject({ goalAmount: "777", goalSource: "explicit" });
    await gateway.setGroupGoal!("familienkreis", "week", null, 9);
    expect(await gateway.getInsights!("familienkreis", "week")).toMatchObject({ goalAmount: "600" });
  });
