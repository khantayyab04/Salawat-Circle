import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { TodayScreen } from "./index";

const mockCreate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockEntries = jest.fn();

jest.mock("@/lib/entries", () => ({
  parseEntryAmount: (value: string) => Number(value),
  useEntries: () => mockEntries(),
}));

jest.mock("@expo/ui", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    BottomSheet: ({
      children,
      isPresented,
    }: {
      children: React.ReactNode;
      isPresented: boolean;
    }) => (isPresented ? <View>{children}</View> : null),
    Column: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("@/localization", () => ({
  formatAppNumber: (value: string) => value,
  useTranslation: () => ({
    localeTag: "de-DE",
    t: (key: string, values?: Record<string, string | number>) =>
      ({
        tabsProgress: "Fortschritt",
        todayTitle: "Heute",
        todayStageAmount: `${values?.amount ?? ""} vormerken`,
        todayCommit: `${values?.amount ?? ""} eintragen`,
        todayCustomAmount: "Eigener Wert",
        todayApplyCustom: "Wert übernehmen",
        todayResetTally: "Auswahl zurücksetzen",
        todayWeeklyContext: "Diese Woche 42 · Ziel 2/4 Tage",
        todayOpenProgress: "Fortschritt öffnen",
        todayNoGoalContext: "Noch kein Ziel festgelegt",
        syncOfflineTitle: "Offline",
        syncOfflineBody: "Änderungen bleiben sicher auf diesem Gerät.",
        syncPendingTitle: "Wird synchronisiert",
        syncPendingBody: "Deine Änderungen sind lokal gespeichert.",
        syncFailedTitle: "Synchronisierung fehlgeschlagen",
        syncFailedBody: "Einige Änderungen brauchen deine Aufmerksamkeit.",
        syncRetry: "Erneut versuchen",
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

function entries(overrides = {}) {
  return {
    viewState: "content",
    entries: [],
    summary: {
      todayTotal: "42",
      weekTotal: "42",
      allTimeTotal: "100",
      todayGoal: "100",
      achievedDays: "2",
      eligibleGoalDays: "4",
    },
    busy: false,
    offlineLoadErrorCode: null,
    syncState: "idle",
    create: mockCreate,
    retrySync: jest.fn(),
    ...overrides,
  };
}

describe("TodayScreen", () => {
  beforeEach(() => {
    mockCreate.mockReset().mockResolvedValue(undefined);
    mockEntries.mockReset();
  });

  it("stages quick-add values and commits their combined amount once", async () => {
    mockEntries.mockReturnValue(entries());
    const view = await render(<TodayScreen />);

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "100 vormerken" }));
      fireEvent.press(view.getByRole("button", { name: "200 vormerken" }));
    });
    expect(view.getByRole("button", { name: "300 eintragen" })).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "300 eintragen" }));
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(300);
  });

  it("preserves a staged amount when the entry cannot be saved", async () => {
    mockCreate.mockRejectedValueOnce(new Error("offline"));
    mockEntries.mockReturnValue(entries());
    const view = await render(<TodayScreen />);

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "100 vormerken" }));
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "100 eintragen" }));
    });
    expect(view.getByRole("button", { name: "100 eintragen" })).toBeTruthy();
  });

  it("adds an exact custom amount to the staged quick-add total", async () => {
    mockEntries.mockReturnValue(entries());
    const view = await render(<TodayScreen />);

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Eigener Wert" }));
    });
    await act(async () => {
      fireEvent.changeText(view.getByLabelText("Eigener Wert"), "42");
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Wert übernehmen" }));
    });

    expect(view.getByRole("button", { name: "42 eintragen" })).toBeTruthy();
  });
});
