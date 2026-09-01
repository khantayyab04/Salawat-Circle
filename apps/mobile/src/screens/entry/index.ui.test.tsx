import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { EntryEditScreen } from "./index";

const mockUpdate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockKeepServerVersion = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockReapplyConflict = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockUseEntries = jest.fn();

jest.mock("@/lib/entries", () => ({
  getPersonalDate: (_date: Date, timeZone: string) => {
    if (!timeZone) throw new RangeError("Invalid time zone");
    return "2026-08-31";
  },
  isEntryDateAllowed: () => true,
  parseEntryAmount: (value: string) => Number(value),
  useEntries: () => mockUseEntries(),
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "entry-1" }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        entryAmountLabel: "Betrag",
        entryDateLabel: "Datum",
        commonSave: "Speichern",
        entryToday: "Heute",
        entryYesterday: "Gestern",
        entryConflict: "Dieser Eintrag wurde anderswo geändert.",
        entryConflictServer: "Server",
        entryConflictLocal: "Meine Änderung",
        entryConflictKeepServer: "Serverstand behalten",
        entryConflictReapply: "Meine Änderung erneut anwenden",
        offlineRecoveryTitle: "Lokale Daten konnten nicht gelesen werden",
        offlineRecoveryBody:
          "Setze den lokalen Speicher zurück und lade deine synchronisierten Daten neu.",
        offlineRecoveryAction: "Lokalen Speicher zurücksetzen",
        offlineLoadRetryTitle: "Lokale Daten sind gerade nicht verfügbar",
        offlineLoadRetryBody:
          "Der lokale Speicher konnte nicht geladen werden. Versuche es erneut.",
        offlineLoadRetryAction: "Erneut laden",
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

describe("EntryEditScreen", () => {
  it("saves an edited amount with the selected valid date", async () => {
    mockUseEntries.mockReturnValue({
      entries: [
        {
          id: "entry-1",
          amount: "42",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          revision: 1,
        },
      ],
      timeZone: "Europe/Berlin",
      busy: false,
      conflictEntryId: null,
      conflicts: [],
      update: mockUpdate,
    });
    const view = await render(<EntryEditScreen />);

    await act(async () => {
      fireEvent.changeText(view.getByLabelText("Betrag"), "99");
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Heute" }));
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Speichern" }));
    });

    expect(mockUpdate).toHaveBeenCalledWith("entry-1", 99, "2026-08-31");
  });

  it("shows an error state instead of using an empty timezone before entries load", async () => {
    mockUseEntries.mockReturnValue({
      entries: [],
      timeZone: "",
      busy: false,
      conflictEntryId: null,
      conflicts: [],
      update: mockUpdate,
    });

    const view = await render(<EntryEditScreen />);

    expect(view.getByText("stateErrorTitle")).toBeTruthy();
  });

  it("shows both versions and explicit conflict resolution actions", async () => {
    mockUseEntries.mockReturnValue({
      entries: [
        {
          id: "entry-1",
          amount: "8",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          revision: 1,
        },
      ],
      timeZone: "Europe/Berlin",
      busy: false,
      conflictEntryId: "entry-2",
      conflict: {
        entryId: "entry-2",
        operation: "update",
        localAmount: "12",
        localEntryDate: "2026-08-30",
        serverEntry: {
          id: "entry-2",
          amount: "10",
          entryDate: "2026-08-30",
          timezone: "Europe/Berlin",
          revision: 6,
        },
      },
      conflicts: [
        {
          entryId: "entry-2",
          operation: "update",
          localAmount: "12",
          localEntryDate: "2026-08-30",
          serverEntry: {
            id: "entry-2",
            amount: "10",
            entryDate: "2026-08-30",
            timezone: "Europe/Berlin",
            revision: 6,
          },
        },
        {
          entryId: "entry-1",
          operation: "update",
          localAmount: "8",
          localEntryDate: "2026-08-31",
          serverEntry: {
            id: "entry-1",
            amount: "7",
            entryDate: "2026-08-31",
            timezone: "Europe/Berlin",
            revision: 2,
          },
        },
      ],
      update: mockUpdate,
      keepServerVersion: mockKeepServerVersion,
      reapplyConflict: mockReapplyConflict,
    });

    const view = await render(<EntryEditScreen />);

    expect(view.getByText("Server: 7 · 2026-08-31")).toBeTruthy();
    expect(view.getByText("Meine Änderung: 8 · 2026-08-31")).toBeTruthy();
    await act(async () => {
      fireEvent.press(
        view.getByRole("button", { name: "Serverstand behalten" }),
      );
    });
    await act(async () => {
      fireEvent.press(
        view.getByRole("button", { name: "Meine Änderung erneut anwenden" }),
      );
    });
    expect(mockKeepServerVersion).toHaveBeenCalledWith("entry-1");
    expect(mockReapplyConflict).toHaveBeenCalledWith("entry-1");
  });

  it("hides direct edit controls while a conflict awaits resolution", async () => {
    mockUseEntries.mockReturnValue({
      entries: [
        {
          id: "entry-1",
          amount: "8",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          revision: 1,
        },
      ],
      timeZone: "Europe/Berlin",
      busy: false,
      conflictEntryId: "entry-1",
      conflicts: [
        {
          entryId: "entry-1",
          operation: "update",
          localAmount: "8",
          localEntryDate: "2026-08-31",
          serverEntry: {
            id: "entry-1",
            amount: "7",
            entryDate: "2026-08-31",
            timezone: "Europe/Berlin",
            revision: 2,
          },
        },
      ],
      update: mockUpdate,
      keepServerVersion: mockKeepServerVersion,
      reapplyConflict: mockReapplyConflict,
    });

    const view = await render(<EntryEditScreen />);

    expect(view.queryByLabelText("Betrag")).toBeNull();
    expect(view.queryByLabelText("Datum")).toBeNull();
    expect(view.queryByRole("button", { name: "Heute" })).toBeNull();
    expect(view.queryByRole("button", { name: "Gestern" })).toBeNull();
    expect(
      view.getByRole("button", { name: "Serverstand behalten" }),
    ).toBeTruthy();
  });

  it("replaces edit controls with recovery when local state is invalid", async () => {
    mockUseEntries.mockReturnValue({
      entries: [
        {
          id: "entry-1",
          amount: "42",
          entryDate: "2026-08-31",
          timezone: "Europe/Berlin",
          revision: 1,
        },
      ],
      timeZone: "Europe/Berlin",
      busy: false,
      errorCode: "INVALID_OFFLINE_STATE",
      offlineLoadErrorCode: "INVALID_OFFLINE_STATE",
      conflictEntryId: null,
      conflicts: [],
      update: mockUpdate,
      resetOfflineState: jest.fn(),
    });

    const view = await render(<EntryEditScreen />);

    expect(
      view.getByRole("button", { name: "Lokalen Speicher zurücksetzen" }),
    ).toBeTruthy();
    expect(
      view.queryByRole("button", { name: "Speichern" }),
    ).toBeNull();
  });

  it("offers retry instead of editing after a transient local cache load failure", async () => {
    const retryOfflineLoad = jest.fn<() => Promise<void>>().mockResolvedValue(
      undefined,
    );
    mockUseEntries.mockReturnValue({
      entries: [],
      timeZone: "",
      busy: false,
      errorCode: "INTERNAL",
      offlineLoadErrorCode: "INTERNAL",
      conflictEntryId: null,
      conflicts: [],
      update: mockUpdate,
      retryOfflineLoad,
    });

    const view = await render(<EntryEditScreen />);

    expect(
      view.getByText("Lokale Daten sind gerade nicht verfügbar"),
    ).toBeTruthy();
    expect(view.queryByLabelText("Betrag")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Erneut laden" }));
    expect(retryOfflineLoad).toHaveBeenCalledTimes(1);
  });
});
