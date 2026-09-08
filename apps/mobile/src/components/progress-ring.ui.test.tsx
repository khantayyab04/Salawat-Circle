import { expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { ProgressRing } from "./progress-ring";
import { processColor } from "react-native";
import { lightColors } from "@/theme";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return { ...actual, useAppTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

it.each([null, 0])("renders %s progress as an empty neutral ring", async (progress) => {
  const view = await render(<ProgressRing progress={progress} size={200} testID="ring" />);
  expect(view.getByTestId("ring").props.accessibilityValue.now).toBe(0);
  expect(circles(view.toJSON())).toHaveLength(1);
});

it.each([{ progress: 0.5, color: lightColors.primary }, { progress: 1, color: lightColors.gold }, { progress: 2, color: lightColors.gold }])(
  "colors progress $progress by goal completion", async ({ progress, color }) => {
    const view = await render(<ProgressRing progress={progress} size={200} testID="ring" />);
    expect(circles(view.toJSON())[1].props.stroke).toEqual({ type: 0, payload: processColor(color) });
    expect(view.getByTestId("ring").props.accessibilityValue.now).toBe(progress === 0.5 ? 50 : 100);
  },
);

function circles(tree: unknown): { props: { stroke: string } }[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(circles);
  const node = tree as { type: string; props: { stroke: string }; children?: unknown };
  return node.type === "RNSVGCircle" ? [node] : circles(node.children);
}
