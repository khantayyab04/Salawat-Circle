import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { ActivityChart } from "./activity-chart";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

const bars = [
  { label: "M", total: "1300", goalReached: true },
  { label: "T", total: "1100", goalReached: true },
  { label: "W", total: "850", goalReached: false },
  { label: "T", total: "0", goalReached: false },
];

describe("ActivityChart", () => {
  it("labels every bucket", async () => {
    const view = await render(<ActivityChart bars={bars} emptyLabel="No data" />);
    expect(view.getAllByText("T")).toHaveLength(2);
    expect(view.getByText("W")).toBeTruthy();
  });

  it("renders the empty label when there is nothing to plot", async () => {
    const view = await render(<ActivityChart bars={[]} emptyLabel="No data" />);
    expect(view.getByText("No data")).toBeTruthy();
  });

  it("survives buckets that are all zero without dividing by zero", async () => {
    const view = await render(
      <ActivityChart
        bars={[
          { label: "M", total: "0", goalReached: null },
          { label: "T", total: "0", goalReached: null },
        ]}
        emptyLabel="No data"
      />,
    );
    expect(view.getByText("M")).toBeTruthy();
  });

  it("handles totals far beyond the safe integer range", async () => {
    const view = await render(
      <ActivityChart
        bars={[
          { label: "2025", total: "9007199254740993000", goalReached: true },
          { label: "2026", total: "1", goalReached: false },
        ]}
        emptyLabel="No data"
      />,
    );
    expect(view.getByText("2025")).toBeTruthy();
    expect(view.getByText("2026")).toBeTruthy();
  });
});
