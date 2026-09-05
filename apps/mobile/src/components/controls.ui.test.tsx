import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { AmountChip } from "./amount-chip";
import { AppToggle } from "./app-toggle";
import { ProgressRing } from "./progress-ring";
import { SegmentedControl } from "./segmented-control";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

describe("SegmentedControl", () => {
  const options = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
    { value: "all", label: "All" },
  ];

  it("marks the selected option for assistive technology", async () => {
    const view = await render(
      <SegmentedControl onChange={() => {}} options={options} value="month" />,
    );
    expect(
      view.getByRole("tab", { name: "Month" }).props.accessibilityState
        .selected,
    ).toBe(true);
    expect(
      view.getByRole("tab", { name: "Week" }).props.accessibilityState.selected,
    ).toBe(false);
  });

  it("reports the chosen option", async () => {
    const onChange = jest.fn();
    const view = await render(
      <SegmentedControl onChange={onChange} options={options} value="week" />,
    );
    fireEvent.press(view.getByRole("tab", { name: "Year" }));
    expect(onChange).toHaveBeenCalledWith("year");
  });

  it("lets every option share the width so none is cut off", async () => {
    const view = await render(
      <SegmentedControl
        onChange={() => {}}
        options={options}
        testID="range"
        value="week"
      />,
    );
    expect(view.getByRole("tab", { name: "All" })).toHaveStyle({ flex: 1 });
  });
});

describe("AppToggle", () => {
  it("exposes its state as a switch", async () => {
    const view = await render(
      <AppToggle accessibilityLabel="Alias mode" onChange={() => {}} value />,
    );
    const toggle = view.getByRole("switch", { name: "Alias mode" });
    expect(toggle.props.accessibilityState.checked).toBe(true);
  });

  it("reports the flipped value", async () => {
    const onChange = jest.fn();
    const view = await render(
      <AppToggle
        accessibilityLabel="Alias mode"
        onChange={onChange}
        value={false}
      />,
    );
    fireEvent.press(view.getByRole("switch", { name: "Alias mode" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("keeps a comfortable touch target", async () => {
    const view = await render(
      <AppToggle accessibilityLabel="Alias mode" onChange={() => {}} value />,
    );
    expect(view.getByRole("switch", { name: "Alias mode" })).toHaveStyle({
      minHeight: 44,
    });
  });
});

describe("AmountChip", () => {
  it("reports the amount it stands for", async () => {
    const onPress = jest.fn();
    const view = await render(<AmountChip amount={500} onPress={onPress} />);
    fireEvent.press(view.getByRole("button", { name: "+500" }));
    expect(onPress).toHaveBeenCalledWith(500);
  });

  it("keeps a comfortable touch target", async () => {
    const view = await render(<AmountChip amount={100} onPress={() => {}} />);
    expect(view.getByRole("button", { name: "+100" })).toHaveStyle({
      minHeight: 48,
    });
  });
});

describe("ProgressRing", () => {
  it("describes the progress rather than exposing raw geometry", async () => {
    const view = await render(
      <ProgressRing
        accessibilityLabel="1,200 of 1,000 reached"
        progress={1}
        size={200}
      />,
    );
    expect(view.getByLabelText("1,200 of 1,000 reached")).toBeTruthy();
  });

  it("never draws beyond a full ring", async () => {
    const view = await render(
      <ProgressRing progress={4} size={200} testID="ring" />,
    );
    expect(view.getByTestId("ring").props.accessibilityValue.now).toBe(100);
  });

  it("treats a missing goal as a complete ring", async () => {
    const view = await render(
      <ProgressRing progress={null} size={200} testID="ring" />,
    );
    expect(view.getByTestId("ring").props.accessibilityValue.now).toBe(100);
  });

  it("clamps negative progress to zero", async () => {
    const view = await render(
      <ProgressRing progress={-1} size={200} testID="ring" />,
    );
    expect(view.getByTestId("ring").props.accessibilityValue.now).toBe(0);
  });
});
