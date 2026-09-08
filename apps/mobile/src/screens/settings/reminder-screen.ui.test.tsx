import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { ReminderSettingsScreen } from "./reminder-screen";
import type { ReminderTime } from "@/lib/reminder/reminder-time";

const mockEnable = jest.fn<() => Promise<void>>();
const mockDisable = jest.fn<() => Promise<void>>();
const mockSetTime = jest.fn<(time: ReminderTime) => Promise<void>>();
const mockEnableJumuah = jest.fn<() => Promise<void>>();
const mockDisableJumuah = jest.fn<() => Promise<void>>();
const mockSetJumuahTime = jest.fn<(time: ReminderTime) => Promise<void>>();
const mockDateTimePickerProps = jest.fn();
let mockReminderError = false;

jest.mock("@/lib/reminder", () => ({
  useReminder: () => ({
    permission: "not_asked",
    enabled: false,
    time: { hour: 20, minute: 0 },
    jumuah: { enabled: false, time: { hour: 12, minute: 0 } },
    busy: false,
    error: mockReminderError,
    enable: mockEnable,
    disable: mockDisable,
    setTime: mockSetTime,
    enableJumuah: mockEnableJumuah,
    disableJumuah: mockDisableJumuah,
    setJumuahTime: mockSetJumuahTime,
  }),
}));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: async () => ({ granted: false }),
  getForegroundPermissionsAsync: async () => ({ granted: false }),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 52.52, longitude: 13.4 } }),
  Accuracy: { Low: 2 },
}));
jest.mock("@expo/ui", () => {
  const { Pressable: MockPressable, Text: MockText } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    Switch: ({
      label,
      onValueChange,
      value,
    }: {
      label: string;
      value: boolean;
      onValueChange(value: boolean): void;
    }) => (
      <MockPressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        onPress={() => onValueChange(!value)}
      >
        <MockText>{label}</MockText>
      </MockPressable>
    ),
  };
});
jest.mock("@expo/ui/community/datetime-picker", () => {
  const DateTimePicker = (props: { value: Date }) => {
    mockDateTimePickerProps(props);
    const { Text: MockText } = jest.requireActual<typeof import("react-native")>(
      "react-native",
    );
    return <MockText>{props.value.toTimeString().slice(0, 5)}</MockText>;
  };
  return { __esModule: true, default: DateTimePicker, DateTimePicker };
});
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        reminderEnabledLabel: "Tägliche Erinnerung",
        reminderPurpose: "Eine ruhige Erinnerung zur gewählten Uhrzeit.",
        reminderJumuahTitle: "Jumuʿah-Erinnerung",
        reminderJumuahEnabledLabel: "Freitags erinnern",
        reminderJumuahPurpose: "Erinnert dich am Freitag an Salawat.",
        reminderJumuahTimeLabel: "Uhrzeit am Freitag",
        reminderJumuahStartTitle: "Beginn des Freitags",
        reminderJumuahStartBody: "Mit Standort beginnt der Freitagsbereich bereits am Donnerstag bei Sonnenuntergang.",
        reminderJumuahLocationEnable: "Standort für Sonnenuntergang verwenden",
        reminderDeviceOnly: "Gilt nur auf diesem Gerät.",
        reminderPermissionNotAsked: "Du entscheidest erst beim Aktivieren.",
        reminderChangeFailedTitle: "Änderung fehlgeschlagen",
        reminderChangeFailedBody:
          "Deine vorige Einstellung bleibt erhalten. Versuche es erneut.",
      })[key] ?? key,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockReminderError = false;
  mockEnable.mockResolvedValue(undefined);
  mockDisable.mockResolvedValue(undefined);
  mockSetTime.mockResolvedValue(undefined);
  mockEnableJumuah.mockResolvedValue(undefined);
  mockDisableJumuah.mockResolvedValue(undefined);
  mockSetJumuahTime.mockResolvedValue(undefined);
  mockDateTimePickerProps.mockClear();
});

describe("ReminderSettingsScreen", () => {
  it("shows a recoverable error after a reminder change fails", async () => {
    mockReminderError = true;

    const view = await render(<ReminderSettingsScreen />);

    expect(view.getByText("Änderung fehlgeschlagen")).toBeTruthy();
    expect(
      view.getByText(
        "Deine vorige Einstellung bleibt erhalten. Versuche es erneut.",
      ),
    ).toBeTruthy();
  });

  it("requests enablement only after the user turns on the reminder switch", async () => {
    const view = await render(<ReminderSettingsScreen />);

    expect(mockEnable).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(
        view.getByRole("switch", { name: "Tägliche Erinnerung" }),
      );
    });

    expect(mockEnable).toHaveBeenCalledTimes(1);
    expect(view.getByText("Gilt nur auf diesem Gerät.")).toBeTruthy();
    expect(mockDateTimePickerProps).toHaveBeenCalledWith(
      expect.objectContaining({ presentation: "inline" }),
    );
  });

  it("offers a separate Friday reminder and keeps the sunset setting in that context", async () => {
    const view = await render(<ReminderSettingsScreen />);

    expect(view.getByText("Jumuʿah-Erinnerung")).toBeTruthy();
    expect(view.getByText("Erinnert dich am Freitag an Salawat.")).toBeTruthy();
    expect(view.getByText("Beginn des Freitags")).toBeTruthy();
    expect(view.getByText("Mit Standort beginnt der Freitagsbereich bereits am Donnerstag bei Sonnenuntergang.")).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByRole("switch", { name: "Freitags erinnern" }));
    });
    expect(mockEnableJumuah).toHaveBeenCalledTimes(1);
  });
});
