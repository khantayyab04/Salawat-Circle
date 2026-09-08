import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { GoalSheet } from "./goal-sheet";
import { Platform } from "react-native";

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
  sliderLabel: "Daily goal slider",
  sliderHint: "Adjust in steps of 100",
  amountLabel: "Goal amount",
  amountHint: "Enter a whole number",
  save: "Save goal",
  clear: "Disable goal",
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
  it("supports named Android accessibility adjustments and honors the busy lock", async () => {
    const previousOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    try {
      const view = await renderSheet();
      await fireEvent(view.getByRole("adjustable", { name: copy.sliderLabel }), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
      expect(view.getByTestId("goal-amount-input").props.value).toBe("1100");
      await fireEvent(view.getByRole("adjustable", { name: copy.sliderLabel }), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
      expect(view.getByTestId("goal-amount-input").props.value).toBe("1000");
      await view.rerender(<GoalSheet visible busy copy={copy} currentGoal="1000" onSave={() => {}} onClose={() => {}} />);
      expect(view.getByRole("adjustable", { name: copy.sliderLabel })).toBeDisabled();
      await fireEvent(view.getByRole("adjustable", { name: copy.sliderLabel }), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
      expect(view.getByTestId("goal-amount-input").props.value).toBe("1000");
    } finally {
      Object.defineProperty(Platform, "OS", { configurable: true, value: previousOS });
    }
  });
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

  it("exposes the native slider label, hint, and exact value", async () => {
    const view = await renderSheet();

    const slider = view.getByTestId("goal-quick-slider");
    expect(slider.props.accessibilityRole).toBe("adjustable");
    expect(slider.props.accessibilityLabel).toBe("Daily goal slider");
    expect(slider.props.accessibilityHint).toBe("Adjust in steps of 100");
    expect(slider.props.accessibilityValue).toEqual({
      min: 100,
      max: 30_000,
      now: 1_000,
      text: "1000",
    });

  });
  it("announces the quick slider's bounded value while retaining a larger exact goal", async () => {
    const view = await renderSheet({ currentGoal: "10000000" });
    expect(view.getByTestId("goal-amount-input").props.value).toBe("10000000");
    expect(view.getByTestId("goal-quick-slider").props.accessibilityValue).toEqual({
      min: 100, max: 30000, now: 30000, text: "30000",
    });
  });

  it("switches the goal off instead of saving a number", async () => {
    const onSave = jest.fn();
    const view = await renderSheet({ onSave });

    await fireEvent.press(
      view.getByRole("switch", { name: "Enable daily goal" }),
    );
    await fireEvent.press(view.getByRole("button", { name: "Disable goal" }));

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("hides the amount field when the goal is off", async () => {
    const view = await renderSheet({ currentGoal: null });
    expect(view.queryByTestId("goal-amount-input")).toBeNull();
    expect(view.getByRole("button", { name: "Save goal" })).toBeDisabled();
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

  it.each(["1.5", "-10", "1e3", ","]) (
    "keeps invalid raw goal text %s visible and blocks saving",
    async (raw) => {
    const view = await renderSheet();
      await fireEvent.changeText(view.getByTestId("goal-amount-input"), raw);
      expect(view.getByTestId("goal-amount-input").props.value).toBe(raw);
      expect(
        view.getByRole("button", { name: "Save goal" }).props
          .accessibilityState.disabled,
      ).toBe(true);
    },
  );

  it("accepts a whole number with leading zeros", async () => {
    const onSave = jest.fn();
    const view = await renderSheet({ onSave });
    await fireEvent.changeText(view.getByTestId("goal-amount-input"), "0010");
    await fireEvent.press(view.getByRole("button", { name: "Save goal" }));
    expect(onSave).toHaveBeenCalledWith(10);
  });

  it("reports a failed save without losing the entered value", async () => {
    const view = await renderSheet({ failed: true });
    expect(view.getByText(copy.failed)).toBeTruthy();
    expect(view.getByTestId("goal-amount-input").props.value).toBe("1000");
  });
});
it("keeps the entered goal if a background snapshot changes while the sheet is open", async () => {
  const onSave = jest.fn();
  const view = await renderSheet({ onSave });
  await fireEvent.changeText(view.getByTestId("goal-amount-input"), "333");
  await view.rerender(<GoalSheet copy={copy} currentGoal="2000" onClose={() => {}} onSave={onSave} visible failed />);
  expect(view.getByTestId("goal-amount-input").props.value).toBe("333");
  await fireEvent.press(view.getByRole("button", { name: "Save goal" }));
  expect(onSave).toHaveBeenCalledWith(333);
});
it("locks the goal form and closing while saving", async () => {
  const close = jest.fn();
  const view = await renderSheet({ busy: true, onClose: close });
  expect(view.getByTestId("goal-amount-input").props.editable).toBe(false);
  await fireEvent.press(view.getByRole("switch", { name: "Enable daily goal" }));
  expect(view.getByTestId("goal-amount-input")).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: "Close" }));
  expect(close).not.toHaveBeenCalled();
});
it("keeps the exact input in sync with the quick goal slider", async () => {
  const onSave = jest.fn();
  const view = await renderSheet({ onSave });
  await fireEvent(view.getByTestId("goal-quick-slider"), "valueChange", 2300);
  expect(view.getByTestId("goal-amount-input").props.value).toBe("2300");
  await fireEvent.press(view.getByRole("button", { name: "Save goal" }));
  expect(onSave).toHaveBeenCalledWith(2300);
});

it("snaps increasing native slider values to 100 steps through 30000", async () => {
  const onSave = jest.fn();
  const view = await renderSheet({ onSave });
  for (const [input, expected] of [[2349, "2300"], [2351, "2400"], [18949, "18900"], [29980, "30000"], [31000, "30000"]] as const) {
    await fireEvent(view.getByTestId("goal-quick-slider"), "valueChange", input);
    expect(view.getByTestId("goal-amount-input").props.value).toBe(expected);
  }
  await fireEvent.press(view.getByRole("button", { name: "Save goal" }));
  expect(onSave).toHaveBeenCalledWith(30000);
});

it("keeps an exact odd amount while positioning the slider on its nearest step", async () => {
  const view = await renderSheet();
  await fireEvent.changeText(view.getByTestId("goal-amount-input"), "333");
  expect(view.getByTestId("goal-amount-input").props.value).toBe("333");
  expect(view.getByTestId("goal-quick-slider").props.accessibilityValue.now).toBe(300);
});
