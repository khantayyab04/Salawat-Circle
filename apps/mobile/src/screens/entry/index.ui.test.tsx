import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { EntryEditScreen } from "./index";

const mockUpdate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
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
      update: mockUpdate,
    });

    const view = await render(<EntryEditScreen />);

    expect(view.getByText("stateErrorTitle")).toBeTruthy();
  });
});
