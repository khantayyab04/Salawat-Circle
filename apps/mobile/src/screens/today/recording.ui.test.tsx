import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { TodayScreen } from "./index";

const mockCreate = jest.fn<(amount: number) => Promise<void>>();
const mockEntries = jest.fn();

jest.mock("@/lib/entries", () => {
  const actual =
    jest.requireActual<typeof import("@/lib/entries")>("@/lib/entries");
  return { ...actual, useEntries: () => mockEntries() };
});

jest.mock("@/localization", () => ({
  formatAppNumber: (value: bigint | number) => String(value),
  useTranslation: () => ({
    localeTag: "en-GB",
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${Object.values(params).join(",")}` : key,
  }),
}));

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

function entriesValue(overrides: Record<string, unknown> = {}) {
  return {
    status: "content",
    busy: false,
    online: true,
    offlineLoadErrorCode: null,
    entries: [],
    conflicts: [],
    summary: {
      todayTotal: "1200",
      weekTotal: "5450",
      allTimeTotal: "126450",
      todayGoal: "1000",
      achievedDays: "4",
      eligibleGoalDays: "7",
    },
    create: mockCreate,
    ...overrides,
  };
}

describe("TodayScreen recording", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue(undefined);
    mockEntries.mockReturnValue(entriesValue());
  });

  it("stages quick amounts without recording anything yet", async () => {
    const view = await render(<TodayScreen />);

    await fireEvent.press(view.getByRole("button", { name: "+100" }));
    await fireEvent.press(view.getByRole("button", { name: "+200" }));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(view.getByTestId("staged-amount").props.children).toBe("300");
  });

  it("names the exact amount the primary action will record", async () => {
    const view = await render(<TodayScreen />);

    await fireEvent.press(view.getByRole("button", { name: "+500" }));

    expect(view.getByRole("button", { name: "todayCommit:500" })).toBeTruthy();
  });

  it("records the staged amount exactly once", async () => {
    const view = await render(<TodayScreen />);

    await fireEvent.press(view.getByRole("button", { name: "+100" }));
    await fireEvent.press(view.getByRole("button", { name: "+200" }));
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "todayCommit:300" }));
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(300);
  });

  it("clears the staged amount after a successful record", async () => {
    const view = await render(<TodayScreen />);

    await fireEvent.press(view.getByRole("button", { name: "+100" }));
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "todayCommit:100" }));
    });

    expect(view.getByTestId("staged-amount").props.children).toBe("0");
  });

  it("keeps the staged amount when recording fails", async () => {
    mockCreate.mockRejectedValue(new Error("OFFLINE"));
    const view = await render(<TodayScreen />);

    await fireEvent.press(view.getByRole("button", { name: "+1000" }));
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "todayCommit:1000" }));
    });

    expect(view.getByTestId("staged-amount").props.children).toBe("1000");
    expect(view.getByText("todaySaveFailed")).toBeTruthy();
  });

  it("clears the staged amount on request", async () => {
    const view = await render(<TodayScreen />);

    await fireEvent.press(view.getByRole("button", { name: "+500" }));
    await fireEvent.press(view.getByRole("button", { name: "todayResetTally" }));

    expect(view.getByTestId("staged-amount").props.children).toBe("0");
  });

  it("adds an arbitrary whole-number amount through the custom amount sheet", async () => {
    const view = await render(<TodayScreen />);

    await fireEvent.press(
      view.getByRole("button", { name: "todayCustomAmount" }),
    );
    await fireEvent.changeText(view.getByTestId("custom-amount-input"), "313");
    await fireEvent.press(
      view.getByRole("button", { name: "todayApplyCustom" }),
    );

    expect(view.getByTestId("staged-amount").props.children).toBe("313");
    expect(view.queryByTestId("custom-amount-input")).toBeNull();
  });

  it("does not stage an invalid custom amount", async () => {
    const view = await render(<TodayScreen />);

    await fireEvent.press(
      view.getByRole("button", { name: "todayCustomAmount" }),
    );
    await fireEvent.changeText(view.getByTestId("custom-amount-input"), "0");

    expect(
      view.getByRole("button", { name: "todayApplyCustom" }).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(view.getByTestId("staged-amount").props.children).toBe("0");
  });

  it("cannot record while nothing is staged", async () => {
    const view = await render(<TodayScreen />);

    const commit = view.getByRole("button", { name: "todaySubmit" });
    expect(commit.props.accessibilityState.disabled).toBe(true);
  });

  it("shows today's total and the goal it is measured against", async () => {
    const view = await render(<TodayScreen />);

    expect(view.getByTestId("today-total").props.children).toBe("1200");
    expect(view.getByText("/ 1000")).toBeTruthy();
  });

  it("offers to set a goal when none exists", async () => {
    mockEntries.mockReturnValue(
      entriesValue({
        summary: {
          todayTotal: "0",
          weekTotal: "0",
          allTimeTotal: "0",
          todayGoal: null,
          achievedDays: "0",
          eligibleGoalDays: "0",
        },
      }),
    );
    const view = await render(<TodayScreen />);

    expect(view.getByRole("button", { name: "todayNoGoal" })).toBeTruthy();
  });
});
