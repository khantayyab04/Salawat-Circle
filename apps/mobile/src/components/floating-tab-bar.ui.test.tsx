import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { FloatingTabBar } from "./floating-tab-bar";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const tabs = [
  { name: "today", label: "Today" },
  { name: "progress", label: "Journey" },
  { name: "groups", label: "Circles" },
  { name: "settings", label: "Settings" },
] as const;

describe("FloatingTabBar", () => {
  it("offers every destination as a labelled tab", async () => {
    const view = await render(
      <FloatingTabBar activeName="today" onSelect={() => {}} tabs={tabs} />,
    );
    for (const tab of tabs) {
      expect(view.getByRole("tab", { name: tab.label })).toBeTruthy();
    }
  });

  it("marks only the active destination as selected", async () => {
    const view = await render(
      <FloatingTabBar activeName="groups" onSelect={() => {}} tabs={tabs} />,
    );
    expect(
      view.getByRole("tab", { name: "Circles" }).props.accessibilityState
        .selected,
    ).toBe(true);
    expect(
      view.getByRole("tab", { name: "Today" }).props.accessibilityState
        .selected,
    ).toBe(false);
  });

  it("reports the chosen destination", async () => {
    const onSelect = jest.fn();
    const view = await render(
      <FloatingTabBar activeName="today" onSelect={onSelect} tabs={tabs} />,
    );
    fireEvent.press(view.getByRole("tab", { name: "Journey" }));
    expect(onSelect).toHaveBeenCalledWith("progress");
  });

  it("keeps every tab at a comfortable touch size", async () => {
    const view = await render(
      <FloatingTabBar activeName="today" onSelect={() => {}} tabs={tabs} />,
    );
    for (const tab of tabs) {
      expect(view.getByRole("tab", { name: tab.label })).toHaveStyle({
        minHeight: 48,
      });
    }
  });

  it("lifts itself clear of the home indicator", async () => {
    const view = await render(
      <FloatingTabBar
        activeName="today"
        onSelect={() => {}}
        tabs={tabs}
        testID="tabbar"
      />,
    );
    expect(view.getByTestId("tabbar")).toHaveStyle({ paddingBottom: 34 });
  });
});
