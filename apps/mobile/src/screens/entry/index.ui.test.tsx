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
      conflictEntryId: "entry-1",
      conflict: {
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
});
