import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
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

describe("TodayScreen", () => {
  it("keeps the Salawat action dominant but disabled until MVP05", async () => {
    const view = await render(<TodayScreen />);
    const action = view.getByRole("button", { name: "Eintragen" });

    expect(view.getByText("Heute erfasst")).toBeTruthy();
    expect(view.getByLabelText("0 Salawat")).toBeTruthy();
    expect(action).toHaveStyle({ minHeight: 48 });
    expect(action.props.accessibilityState).toEqual({ disabled: true });
  });
});
