import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { ActivityChart } from "./activity-chart";
import { StyleSheet } from "react-native";
import { lightColors } from "@/theme";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

const bars = [
  { label: "M", total: "1300", goalTotal: "1000", goalReached: true },
  { label: "T", total: "1100", goalTotal: "1000", goalReached: true },
  { label: "W", total: "850", goalTotal: "1000", goalReached: false },
  { label: "T", total: "0", goalTotal: "1000", goalReached: false },
];
const statusLabels = { reached: "Ziel erreicht", below: "Unter dem Ziel", recorded: "Erfasst", future: "Zukünftig", current: "Aktueller Zeitraum" };

describe("ActivityChart", () => {
  it("makes goal and future status understandable without color", async () => {
    const view = await render(<ActivityChart statusLabels={statusLabels} emptyLabel="No data" bars={[
      { label: "Mo", total: "100", goalTotal: "100", goalReached: true },
      { label: "Di", total: "50", goalTotal: "100", goalReached: false },
      { label: "Mi", total: "33", goalTotal: null, goalReached: null, current: true },
      { label: "Do", total: "0", goalTotal: null, goalReached: null, future: true },
    ]} />);
    expect(view.getByLabelText("Mo: 100, Ziel erreicht")).toBeTruthy();
    expect(view.getByLabelText("Di: 50, Unter dem Ziel")).toBeTruthy();
    expect(view.getByLabelText("Mi: 33, Erfasst, Aktueller Zeitraum")).toBeTruthy();
    expect(view.getByLabelText("Do: —, Zukünftig")).toBeTruthy();
    expect(view.queryByText("✓ Ziel erreicht")).toBeNull();
    expect(view.queryByText("− Unter dem Ziel")).toBeNull();
    expect(view.queryByText("✓")).toBeNull();
    expect(view.queryByText("−")).toBeNull();
  });
  it("labels every bucket", async () => {
    const view = await render(<ActivityChart statusLabels={statusLabels} bars={bars} emptyLabel="No data" />);
    expect(view.getAllByText("T")).toHaveLength(2);
    expect(view.getByText("W")).toBeTruthy();
  });

  it("renders the empty label when there is nothing to plot", async () => {
    const view = await render(<ActivityChart statusLabels={statusLabels} bars={[]} emptyLabel="No data" />);
    expect(view.getByText("No data")).toBeTruthy();
  });

  it("survives buckets that are all zero without dividing by zero", async () => {
    const view = await render(
      <ActivityChart
        statusLabels={statusLabels}
        bars={[
          { label: "M", total: "0", goalTotal: null, goalReached: null },
          { label: "T", total: "0", goalTotal: null, goalReached: null },
        ]}
        emptyLabel="No data"
      />,
    );
    expect(view.getByText("M")).toBeTruthy();
  });

  it("handles totals far beyond the safe integer range", async () => {
    const view = await render(
      <ActivityChart
        statusLabels={statusLabels}
        bars={[
          { label: "2025", total: "9007199254740993000", goalTotal: "1000", goalReached: true },
          { label: "2026", total: "1", goalTotal: "1000", goalReached: false },
        ]}
        emptyLabel="No data"
      />,
    );
    expect(view.getByText("2025")).toBeTruthy();
    expect(view.getByText("2026")).toBeTruthy();
  });
});
it("exposes each exact bucket amount to assistive technology", async () => {
  const view = await render(<ActivityChart statusLabels={statusLabels} bars={[{ label: "Mo", total: "333", goalTotal: null, goalReached: null }]} emptyLabel="No data" />);
  expect(view.getByLabelText("Mo: 333, Erfasst")).toBeTruthy();
});

it("fills each bucket against its own goal with green partial and gold complete bars", async () => {
  const view = await render(<ActivityChart statusLabels={statusLabels} emptyLabel="No data" bars={[
    { label: "Half", total: "500", goalTotal: "1000", goalReached: false },
    { label: "Full", total: "500", goalTotal: "500", goalReached: true },
    { label: "Exceeded", total: "999999", goalTotal: "1000", goalReached: true },
  ]} />);
  const fills = chartFills(view.toJSON());
  expect(fills).toEqual([
    { height: 60, backgroundColor: lightColors.primary },
    { height: 120, backgroundColor: lightColors.gold },
    { height: 120, backgroundColor: lightColors.gold },
  ]);
});

function chartFills(tree: unknown): { height: number; backgroundColor: string }[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(chartFills);
  const node = tree as { props?: { style?: unknown }; children?: unknown };
  const style = StyleSheet.flatten(node.props?.style as never) as { height?: number; backgroundColor?: string } | undefined;
  if (style && (style.backgroundColor === lightColors.primary || style.backgroundColor === lightColors.gold) && typeof style.height === "number") {
    return [{ height: style.height, backgroundColor: style.backgroundColor }];
  }
  return chartFills(node.children);
}
