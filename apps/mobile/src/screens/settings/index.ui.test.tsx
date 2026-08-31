import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SettingsScreen } from "./index";

const mockReplace = jest.fn();
const mockSignOut = jest.fn<() => Promise<void>>();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    busy: false,
    errorCode: null,
    signOut: mockSignOut,
  }),
}));
jest.mock("@expo/ui", () => {
  const { Pressable, Text, View } = jest.requireActual<
    typeof import("react-native")
  >("react-native");
  function Picker({ children }: { children: React.ReactNode }) {
    return <View>{children}</View>;
  }
  Picker.Item = function PickerItem({ label }: { label: string }) {
    return <Text>{label}</Text>;
  };
  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    List: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    ListItem: ({ children }: { children: string }) => <Text>{children}</Text>,
    Picker,
    Button: ({ children, onPress }: { children: string; onPress(): void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    preference: "system",
    setPreference: jest.fn(),
    t: (key: string) =>
      ({
        settingsLanguage: "Sprache",
        settingsLanguageHint: "Sprache der App",
        settingsLanguageSystem: "System",
        settingsLanguageGerman: "Deutsch",
        settingsLanguageEnglish: "Englisch",
        settingsProfile: "Profil",
        settingsReminder: "Erinnerung",
        settingsPrivacy: "Datenschutz",
        settingsLegal: "Rechtliches",
        settingsSupport: "Support",
        settingsSignOut: "Abmelden",
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

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
});

describe("MVP03 settings", () => {
  it("signs out and returns to the public welcome flow", async () => {
    const view = await render(<SettingsScreen />);

    fireEvent.press(view.getByRole("button", { name: "Abmelden" }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith("/welcome");
  });
});
