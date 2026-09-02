import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { ReminderSettingsScreen } from "./reminder-screen";
import type { ReminderTime } from "@/lib/reminder/reminder-time";

const mockEnable = jest.fn<() => Promise<void>>();
const mockDisable = jest.fn<() => Promise<void>>();
const mockSetTime = jest.fn<(time: ReminderTime) => Promise<void>>();
const mockDateTimePickerProps = jest.fn();

jest.mock("@/lib/reminder", () => ({
  useReminder: () => ({
    permission: "not_asked",
    enabled: false,
    time: { hour: 20, minute: 0 },
    busy: false,
    enable: mockEnable,
    disable: mockDisable,
    setTime: mockSetTime,
  }),
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
        reminderDeviceOnly: "Gilt nur auf diesem Gerät.",
        reminderPermissionNotAsked: "Du entscheidest erst beim Aktivieren.",
      })[key] ?? key,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockEnable.mockResolvedValue(undefined);
  mockDisable.mockResolvedValue(undefined);
  mockSetTime.mockResolvedValue(undefined);
  mockDateTimePickerProps.mockClear();
});

describe("ReminderSettingsScreen", () => {
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
});
