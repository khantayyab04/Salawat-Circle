import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { TodayScreen } from "./index";

const mockCreate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockEntries = jest.fn();

jest.mock("@/lib/entries", () => ({
  describeGoalProgress: (achieved: string, eligible: string) =>
    eligible === "0" ? null : { achievedDays: achieved, eligibleDays: eligible },
  parseEntryAmount: (value: string) => Number(value),
  useEntries: () => mockEntries(),
}));
jest.mock("@/components", () => {
  const actual = jest.requireActual<typeof import("@/components")>("@/components");
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    ...actual,
    GoalSection: ({ goal }: { goal: string | null }) => (
      <Text>{`goal:${goal ?? "none"}`}</Text>
    ),
  };
});
jest.mock("@/localization", () => ({
  formatAppNumber: (value: string) => value,
  useTranslation: () => ({
    localeTag: "de-DE",
    t: (key: string) =>
      ({
        todayHeading: "Heute erfasst",
        todayAddLabel: "Salawat hinzufügen",
        todayAddHint: "Gib eine ganze Zahl ein.",
        todaySubmit: "Eintragen",
        todayDashboard: "Übersicht",
        todayTotal: "Gesamt",
        todayWeek: "Diese Woche",
        todayGoal: "Tagesziel",
        todayGoalDays: "Ziel erreicht",
        todayNoGoal: "Kein Ziel",
        todayNoGoalDay: "Noch kein Zieltag",
        todayHistory: "Verlauf",
        todayHistoryEmpty: "Noch keine Einträge vorhanden.",
        historyLoadMore: "Weitere Einträge laden",
        historyLoadFailed: "Weitere Einträge konnten nicht geladen werden.",
      })[key] ?? key,
  }),
}));

function entries(overrides = {}) {
  return {
    viewState: "content",
    entries: [],
    summary: {
      todayTotal: "42",
      weekTotal: "42",
      allTimeTotal: "100",
      todayGoal: null,
      achievedDays: "0",
      eligibleGoalDays: "0",
    },
    timeZone: "Europe/Berlin",
    hasMore: false,
    loadingMore: false,
    busy: false,
    errorCode: null,
    conflictEntryId: null,
    create: mockCreate,
    delete: jest.fn(),
    setGoal: jest.fn(),
    clearGoal: jest.fn(),
    loadMore: jest.fn(),
    ...overrides,
  };
}
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

describe("TodayScreen", () => {
  it("submits one valid amount and renders live canonical totals", async () => {
    mockEntries.mockReturnValue(entries());
    const view = await render(<TodayScreen />);

    await act(async () => {
      fireEvent.changeText(view.getByLabelText("Salawat hinzufügen"), "42");
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Eintragen" }));
    });

    expect(mockCreate).toHaveBeenCalledWith(42);
    expect(view.getByLabelText("42 Salawat")).toBeTruthy();
    expect(view.getAllByText("100")).not.toHaveLength(0);
    expect(view.getAllByText("42")).not.toHaveLength(0);
  });

  it("keeps a retry action visible when loading another page fails", async () => {
    mockEntries.mockReturnValue(entries({ hasMore: true, paginationError: true }));

    const view = await render(<TodayScreen />);

    expect(
      view.getByText("Weitere Einträge konnten nicht geladen werden."),
    ).toBeTruthy();
    expect(
      view.getByRole("button", { name: "Weitere Einträge laden" }),
    ).toBeTruthy();
  });

  it("shows the server-calculated daily goal and weekly progress", async () => {
    mockEntries.mockReturnValue(
      entries({
        summary: {
          todayTotal: "42",
          weekTotal: "42",
          allTimeTotal: "100",
          todayGoal: "100",
          achievedDays: "2",
          eligibleGoalDays: "4",
        },
      }),
    );

    const view = await render(<TodayScreen />);

    expect(view.getAllByText("100")).not.toHaveLength(0);
    expect(view.getByText("2/4")).toBeTruthy();
    expect(view.getByText("goal:100")).toBeTruthy();
  });
});
