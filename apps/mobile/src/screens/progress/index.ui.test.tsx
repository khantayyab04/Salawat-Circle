import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ProgressScreen } from "./index";

jest.mock("@/lib/entries", () => ({
  parseGoalAmount: (value: string) => Number(value),
  useEntries: () => ({
    entries: [
      { id: "a", amount: "100", entryDate: "2026-09-02", timezone: "UTC" },
      { id: "b", amount: "100", entryDate: "2026-09-01", timezone: "UTC" },
    ],
    summary: {
      todayGoal: "100",
      weekTotal: "200",
      allTimeTotal: "1000",
      achievedDays: "2",
      eligibleGoalDays: "2",
    },
    timeZone: "UTC",
    syncState: "idle",
    offlineLoadErrorCode: null,
    busy: false,
    setGoal: jest.fn(),
    clearGoal: jest.fn(),
    delete: jest.fn(),
  }),
}));
jest.mock("@/localization", () => ({
  formatAppDate: (date: Date) => date.toISOString().slice(0, 10),
  formatAppNumber: (value: bigint) => String(value),
  useTranslation: () => ({
    localeTag: "de-DE",
    t: (key: string, options?: Record<string, string | number>) =>
      ({
        progressTitle: "Fortschritt",
        progressWeek: "Deine Woche",
        progressMonth: "Dein Monat",
        progressAllTime: "Gesamt",
        progressStreak: `${options?.count ?? ""} aktive Tage in Folge`,
        progressGoalRate: `${options?.achieved ?? ""} / ${options?.eligible ?? ""} Tage mit Ziel`,
        progressHistory: "Tage im Überblick",
        todayGoal: "Tagesziel",
        todayNoGoal: "Kein Ziel",
        todayGoalDays: "Ziel erreicht",
        todayNoGoalDay: "Noch kein Zieltag",
        todayWeek: "Diese Woche",
        todayTotal: "Gesamt",
        progressEntries: `${options?.count ?? ""} Einträge`,
        stateEmptyBody: "Noch keine Daten",
        todayHistoryEmpty: "Noch keine Einträge",
        progressGoalOpen: "Tagesziel anpassen",
        goalTitle: "Tagesziel",
        goalSliderLabel: "Tagesziel-Regler",
        goalAmountLabel: "Zielwert",
        goalSave: "Ziel speichern",
        goalClear: "Ziel deaktivieren",
        entryDelete: "Löschen",
      })[key] ?? key,
  }),
}));
jest.mock("@expo/ui", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    BottomSheet: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Column: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Slider: () => <View />,
  };
});
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false, isJumuah: false }),
  };
});

describe("ProgressScreen", () => {
  it("shows a calm streak and switches to the monthly view explicitly", async () => {
    const view = await render(<ProgressScreen />);
    expect(view.getByText("2 aktive Tage in Folge")).toBeTruthy();

    fireEvent.press(view.getByRole("button", { name: "Dein Monat" }));

    expect(view.getByText("Dein Monat")).toBeTruthy();
  });
});
