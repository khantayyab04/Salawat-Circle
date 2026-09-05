import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { AmountText } from "./amount-text";
import { SectionLabel } from "./section-label";
import { StatCard } from "./stat-card";

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

describe("AmountText", () => {
  it("renders the full value without truncating it", async () => {
    const view = await render(<AmountText value="10,000,000" />);
    expect(view.getByText("10,000,000")).toBeTruthy();
  });

  it("never clips long values, it shrinks them instead", async () => {
    const view = await render(<AmountText testID="amount" value="10,000,000" />);
    const node = view.getByTestId("amount");
    expect(node.props.numberOfLines).toBe(1);
    expect(node.props.adjustsFontSizeToFit).toBe(true);
    expect(node.props.ellipsizeMode).toBe("clip");
  });

  it("caps how far the system font scale may enlarge a display value", async () => {
    const view = await render(<AmountText testID="amount" value="1,200" />);
    expect(view.getByTestId("amount").props.maxFontSizeMultiplier).toBe(1.3);
  });

  it("exposes the amount to assistive technology as one label", async () => {
    const view = await render(
      <AmountText accessibilityLabel="1,200 Salawat today" value="1,200" />,
    );
    expect(view.getByLabelText("1,200 Salawat today")).toBeTruthy();
  });
});

describe("SectionLabel", () => {
  it("renders its copy in the wide uppercase style", async () => {
    const view = await render(<SectionLabel testID="label">Staged</SectionLabel>);
    expect(view.getByTestId("label")).toHaveStyle({
      textTransform: "uppercase",
    });
  });

  it("wraps long labels instead of cutting them off", async () => {
    const view = await render(
      <SectionLabel testID="label">Group needs per day</SectionLabel>,
    );
    expect(view.getByTestId("label").props.numberOfLines).toBeUndefined();
  });
});

describe("StatCard", () => {
  it("shows its value and caption", async () => {
    const view = await render(<StatCard caption="Active streak" value="6 Days" />);
    expect(view.getByText("6 Days")).toBeTruthy();
    expect(view.getByText("Active streak")).toBeTruthy();
  });

  it("keeps a very large value fully readable", async () => {
    const view = await render(
      <StatCard caption="All time total" testID="stat" value="126,450,000" />,
    );
    expect(view.getByText("126,450,000")).toBeTruthy();
    expect(view.getByTestId("stat-value").props.adjustsFontSizeToFit).toBe(true);
  });

  it("shares the row instead of claiming a fixed width", async () => {
    const view = await render(
      <StatCard caption="This week" testID="stat" value="5,450" />,
    );
    expect(view.getByTestId("stat")).toHaveStyle({ flex: 1 });
  });
});
