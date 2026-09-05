import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { GoalSheet } from "./goal-sheet";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

const copy = {
  title: "Daily goal",
  subtitle: "Set your north star",
  enableLabel: "Enable daily goal",
  enableHint: "Track your consistency",
  unit: "Salawat per day",
  save: "Save goal",
  close: "Close",
  invalid: "Enter a whole number between 1 and 10,000,000.",
  failed: "The goal could not be saved.",
};

function renderSheet(overrides: Record<string, unknown> = {}) {
  return render(
    <GoalSheet
      copy={copy}
      currentGoal="1000"
      onClose={() => {}}
      onSave={() => {}}
      visible
      {...overrides}
    />,
  );
}

describe("GoalSheet", () => {
  it("starts from the saved goal", async () => {
    const view = await renderSheet();
    expect(view.getByTestId("goal-amount-input").props.value).toBe("1000");
  });

  it("saves the entered goal", async () => {
    const onSave = jest.fn();
    const view = await renderSheet({ onSave });

    await fireEvent.changeText(view.getByTestId("goal-amount-input"), "2500");
    await fireEvent.press(view.getByRole("button", { name: "Save goal" }));

    expect(onSave).toHaveBeenCalledWith(2500);
  });

  it("switches the goal off instead of saving a number", async () => {
    const onSave = jest.fn();
    const view = await renderSheet({ onSave });

    await fireEvent.press(
      view.getByRole("switch", { name: "Enable daily goal" }),
    );
    await fireEvent.press(view.getByRole("button", { name: "Save goal" }));

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("hides the amount field when the goal is off", async () => {
    const view = await renderSheet({ currentGoal: null });
    expect(view.queryByTestId("goal-amount-input")).toBeNull();
  });

  it("refuses to save a value outside the permitted range", async () => {
    const view = await renderSheet();

    await fireEvent.changeText(
      view.getByTestId("goal-amount-input"),
      "20000000",
    );

    expect(
      view.getByRole("button", { name: "Save goal" }).props.accessibilityState
        .disabled,
    ).toBe(true);
    expect(view.getByText(copy.invalid)).toBeTruthy();
  });

  it("refuses to save an empty value", async () => {
    const view = await renderSheet();
    await fireEvent.changeText(view.getByTestId("goal-amount-input"), "");
    expect(
      view.getByRole("button", { name: "Save goal" }).props.accessibilityState
        .disabled,
    ).toBe(true);
  });

  it("ignores anything that is not a digit", async () => {
    const view = await renderSheet();
    await fireEvent.changeText(view.getByTestId("goal-amount-input"), "1a2b3");
    expect(view.getByTestId("goal-amount-input").props.value).toBe("123");
  });

  it("reports a failed save without losing the entered value", async () => {
    const view = await renderSheet({ failed: true });
    expect(view.getByText(copy.failed)).toBeTruthy();
    expect(view.getByTestId("goal-amount-input").props.value).toBe("1000");
  });
});
