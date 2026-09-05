import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ListRow, SegmentedControl } from "./index";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false, isJumuah: false }),
  };
});

describe("ListRow", () => {
  it("exposes its value and destination as one accessible action", async () => {
    const onPress = jest.fn();
    const view = await render(
      <ListRow
        label="Freitagskreis"
        onPress={onPress}
        supporting="Rang 2 · 2.933 diese Woche"
        value="8 Mitglieder"
      />,
    );

    const row = view.getByRole("button", { name: /Freitagskreis/ });
    fireEvent.press(row);
    expect(row.props.accessibilityLabel).toContain("8 Mitglieder");
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("SegmentedControl", () => {
  it("announces the selected view and changes it through an explicit tap target", async () => {
    const onChange = jest.fn();
    const view = await render(
      <SegmentedControl
        onChange={onChange}
        options={[
          { label: "Woche", value: "week" },
          { label: "Monat", value: "month" },
        ]}
        value="week"
      />,
    );

    fireEvent.press(view.getByRole("button", { name: "Monat" }));
    expect(onChange).toHaveBeenCalledWith("month");
    expect(view.getByRole("button", { name: "Woche" }).props.accessibilityState)
      .toMatchObject({ selected: true });
  });
});
