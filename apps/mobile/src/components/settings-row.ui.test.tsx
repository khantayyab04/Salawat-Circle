import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { SettingsRow } from "./settings-row";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

describe("SettingsRow", () => {
  it("shows its label and trailing value", async () => {
    const view = await render(
      <SettingsRow label="Daily reminders" onPress={() => {}} value="8:00 PM" />,
    );
    expect(view.getByText("Daily reminders")).toBeTruthy();
    expect(view.getByText("8:00 PM")).toBeTruthy();
  });

  it("opens its destination when pressed", async () => {
    const onPress = jest.fn();
    const view = await render(
      <SettingsRow label="Profile" onPress={onPress} />,
    );
    await fireEvent.press(view.getByRole("button", { name: "Profile" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is not a button when it has no destination", async () => {
    const view = await render(<SettingsRow label="App version" value="1.0.0" />);
    expect(view.queryByRole("button")).toBeNull();
    expect(view.getByText("App version")).toBeTruthy();
  });

  it("lets a control replace the chevron", async () => {
    const view = await render(
      <SettingsRow label="Alias mode" trailing={<Text>switch</Text>} />,
    );
    expect(view.getByText("switch")).toBeTruthy();
  });

  it("keeps a comfortable row height for touch", async () => {
    const view = await render(
      <SettingsRow label="Privacy" onPress={() => {}} />,
    );
    const row = view.getByRole("button", { name: "Privacy" }).children[0];
    const style = (row as unknown as { props: Record<string, any> }).props
      .style as { minHeight?: number };
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
