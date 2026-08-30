import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { TodayScreen } from "./index";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/localization", () => ({
  formatAppNumber: (value: number) => String(value),
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
        stateEmptyTitle: "Noch keine Inhalte",
        stateEmptyBody: "Hier erscheint etwas, sobald Daten vorhanden sind.",
      })[key] ?? key,
  }),
}));
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});
jest.mock("@/lib/hooks/use-salawat", () => ({
  useSalawatSummary: () => ({
    summary: {
      today_date: "2026-08-30",
      today_total: 0,
      week_start: "2026-08-24",
      week_total: 0,
      all_time_total: 0,
      today_goal: null,
      achieved_days: 0,
      eligible_goal_days: 0,
      pending_server_count: 0,
      calculated_at: "2026-08-30T00:00:00.000Z",
    },
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
  useSalawatEntries: () => ({
    entries: [],
    hasMore: false,
    loadMore: jest.fn(),
    loading: false,
    refresh: jest.fn(),
  }),
  useSalawatActions: () => ({
    addEntry: jest.fn(),
    updateEntry: jest.fn(),
    removeEntry: jest.fn(),
    setGoal: jest.fn(),
    resolveConflict: jest.fn(),
    actionLoading: false,
    actionError: null,
  }),
}));

describe("TodayScreen", () => {
  it("renders Today screen and enables submit when valid number entered", async () => {
    const view = await render(<TodayScreen />);
    const action = view.getByRole("button", { name: "Eintragen" });

    expect(view.getByText("Heute erfasst")).toBeTruthy();
    expect(action.props.accessibilityState.disabled).toBe(true);

    const input = view.getByHintText("Gib eine ganze Zahl ein.");
    fireEvent.changeText(input, "150");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const updatedAction = view.getByRole("button", { name: "Eintragen" });
    expect(updatedAction.props.accessibilityState.disabled).toBe(false);
  });
});
