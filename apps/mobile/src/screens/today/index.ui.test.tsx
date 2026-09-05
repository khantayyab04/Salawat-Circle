import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";
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
        syncOfflineTitle: "Offline",
        syncOfflineBody: "Änderungen bleiben sicher auf diesem Gerät.",
        syncPendingTitle: "Wird synchronisiert",
        syncPendingBody: "Deine Änderungen sind lokal gespeichert.",
        syncFailedTitle: "Synchronisierung fehlgeschlagen",
        syncFailedBody: "Einige Änderungen brauchen deine Aufmerksamkeit.",
        syncRetry: "Erneut versuchen",
        offlineRecoveryTitle: "Lokale Daten konnten nicht gelesen werden",
        offlineRecoveryBody:
          "Setze den lokalen Speicher zurück und lade deine synchronisierten Daten neu.",
        offlineRecoveryAction: "Lokalen Speicher zurücksetzen",
        offlineRecoveryConfirmTitle: "Lokale Daten zurücksetzen?",
        offlineRecoveryConfirmBody:
          "Nicht synchronisierte Änderungen auf diesem Gerät gehen verloren.",
        offlineRecoveryConfirmAction: "Zurücksetzen",
        offlineLoadRetryTitle: "Lokale Daten sind gerade nicht verfügbar",
        offlineLoadRetryBody:
          "Der lokale Speicher konnte nicht geladen werden. Versuche es erneut.",
        offlineLoadRetryAction: "Erneut laden",
        commonCancel: "Abbrechen",
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
    offlineLoadErrorCode: null,
    conflictEntryId: null,
    conflict: null,
    syncState: "idle",
    pendingCount: 0,
    failedCount: 0,
    create: mockCreate,
    delete: jest.fn(),
    setGoal: jest.fn(),
    clearGoal: jest.fn(),
    loadMore: jest.fn(),
    retrySync: jest.fn(),
    retryOfflineLoad: jest.fn(),
    resetOfflineState: jest.fn(),
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



  it("keeps failed offline changes visible and retryable", async () => {
    const retrySync = jest.fn();
    mockEntries.mockReturnValue(
      entries({ syncState: "error", failedCount: 1, retrySync }),
    );

    const view = await render(<TodayScreen />);

    expect(view.getByText("Synchronisierung fehlgeschlagen")).toBeTruthy();
    await fireEvent.press(view.getByRole("button", { name: "Erneut versuchen" }));
    expect(retrySync).toHaveBeenCalled();
  });

  it("replaces mutation controls with an explicit invalid-state recovery action", async () => {
    mockEntries.mockReturnValue(
      entries({
        viewState: "error",
        errorCode: "INVALID_OFFLINE_STATE",
        offlineLoadErrorCode: "INVALID_OFFLINE_STATE",
      }),
    );

    const view = await render(<TodayScreen />);

    expect(
      view.getByText("Lokale Daten konnten nicht gelesen werden"),
    ).toBeTruthy();
    expect(
      view.getByText(
        "Setze den lokalen Speicher zurück und lade deine synchronisierten Daten neu.",
      ),
    ).toBeTruthy();
    expect(
      view.getByRole("button", { name: "Lokalen Speicher zurücksetzen" }),
    ).toBeTruthy();
    expect(
      view.queryByRole("button", { name: "Eintragen" }),
    ).toBeNull();
  });

  it("requires confirmation before resetting an invalid local cache", async () => {
    const resetOfflineState = jest.fn<() => Promise<void>>().mockResolvedValue(
      undefined,
    );
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockEntries.mockReturnValue(
      entries({
        viewState: "error",
        errorCode: "INVALID_OFFLINE_STATE",
        offlineLoadErrorCode: "INVALID_OFFLINE_STATE",
        resetOfflineState,
      }),
    );
    const view = await render(<TodayScreen />);

    await fireEvent.press(
      view.getByRole("button", { name: "Lokalen Speicher zurücksetzen" }),
    );

    expect(resetOfflineState).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Lokale Daten zurücksetzen?",
      "Nicht synchronisierte Änderungen auf diesem Gerät gehen verloren.",
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    const cancel = buttons.find(({ style }) => style === "cancel");
    const confirm = buttons.find(({ style }) => style === "destructive");
    cancel?.onPress?.();
    expect(resetOfflineState).not.toHaveBeenCalled();
    confirm?.onPress?.();
    expect(resetOfflineState).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it("shows retry-only recovery for a transient local cache load failure", async () => {
    const retryOfflineLoad = jest.fn<() => Promise<void>>().mockResolvedValue(
      undefined,
    );
    mockEntries.mockReturnValue(
      entries({
        viewState: "error",
        errorCode: "INTERNAL",
        offlineLoadErrorCode: "INTERNAL",
        retryOfflineLoad,
      }),
    );

    const view = await render(<TodayScreen />);

    expect(
      view.getByText("Lokale Daten sind gerade nicht verfügbar"),
    ).toBeTruthy();
    expect(
      view.getByText(
        "Der lokale Speicher konnte nicht geladen werden. Versuche es erneut.",
      ),
    ).toBeTruthy();
    expect(
      view.queryByRole("button", { name: "Lokalen Speicher zurücksetzen" }),
    ).toBeNull();
    expect(
      view.queryByRole("button", { name: "Eintragen" }),
    ).toBeNull();
    await fireEvent.press(view.getByRole("button", { name: "Erneut laden" }));
    expect(retryOfflineLoad).toHaveBeenCalledTimes(1);
  });
});
