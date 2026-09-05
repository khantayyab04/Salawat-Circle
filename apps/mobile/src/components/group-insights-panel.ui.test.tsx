import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { GroupInsightsPanel } from "./group-insights-panel";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

const copy = {
  goalPrefix: "Group goal:",
  remaining: "remaining",
  noGoal: "No group goal yet",
  groupPerDay: "Group needs per day",
  youPerDay: "You need per day",
  activeMembers: "Active members",
  updated: "Updated",
};

function renderPanel(overrides: Record<string, unknown> = {}) {
  return render(
    <GroupInsightsPanel
      activeMembers="8"
      copy={copy}
      goalAmount="30,000"
      goalPercent={82}
      groupPerDay="2,700"
      perPersonPerDay="338"
      periodTotal="24,600"
      remaining="5,400"
      totalMembers="12"
      updatedLabel="2m ago"
      {...overrides}
    />,
  );
}

describe("GroupInsightsPanel", () => {
  it("shows the collective progress towards the goal", async () => {
    const view = await renderPanel();
    expect(view.getByText("Group goal: 30,000")).toBeTruthy();
    expect(view.getByText("24,600")).toBeTruthy();
    expect(view.getByText("5,400 remaining")).toBeTruthy();
  });

  it("shows what the group and the member each need per day", async () => {
    const view = await renderPanel();
    expect(view.getByText("2,700")).toBeTruthy();
    expect(view.getByText("338")).toBeTruthy();
  });

  it("reports goal progress as a percentage to assistive technology", async () => {
    const view = await renderPanel();
    // 24,600 of 30,000 is 82 percent.
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBe(82);
  });

  it("never reports more than a finished goal", async () => {
    const view = await renderPanel({
      goalPercent: 200,
      periodTotal: "60,000",
      remaining: "0",
    });
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBe(100);
  });

  it("explains the absence of a goal instead of showing an empty bar", async () => {
    const view = await renderPanel({
      goalAmount: null,
      goalPercent: null,
      remaining: null,
      groupPerDay: null,
      perPersonPerDay: null,
    });
    expect(view.getByText("No group goal yet")).toBeTruthy();
    expect(view.queryByRole("progressbar")).toBeNull();
  });

  it("falls back to the active count when the total is unknown", async () => {
    const view = await renderPanel({ totalMembers: null });
    expect(view.getByText("8")).toBeTruthy();
  });

  it("keeps a very large collective total fully readable", async () => {
    const view = await renderPanel({ periodTotal: "123,456,789" });
    expect(view.getByText("123,456,789").props.adjustsFontSizeToFit).toBe(true);
  });
});
