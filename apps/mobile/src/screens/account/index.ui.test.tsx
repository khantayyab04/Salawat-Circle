import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { AccountScreen } from "./index";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    busy: false,
    errorCode: null,
    signOut: jest.fn(),
    signOutEverywhere: jest.fn(),
  }),
}));
jest.mock("@expo/ui", () => {
  const { Text: MockText, View: MockView } = jest.requireActual<
    typeof import("react-native")
  >("react-native");
  function Picker({ children }: { children: React.ReactNode }) {
    return <MockView>{children}</MockView>;
  }
  Picker.Item = function PickerItem({ label }: { label: string }) {
    return <MockText>{label}</MockText>;
  };
  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    List: ({ children }: { children: React.ReactNode }) => <MockView>{children}</MockView>,
    ListItem: ({ children }: { children: React.ReactNode }) => <MockText>{children}</MockText>,
    Picker,
  };
});
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    preference: "system",
    setPreference: jest.fn(),
    t: (key: string) =>
      ({
        accountTitle: "Konto",
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
        settingsDangerZone: "Sicherheitsbereich",
        settingsSignOut: "Abmelden",
        settingsSignOutEverywhere: "Auf allen Geräten abmelden",
        settingsVersion: "App-Version",
        settingsVersionUnavailable: "Nicht verfügbar",
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
});

describe("AccountScreen", () => {
  it("groups destructive session actions under a distinct safety heading", async () => {
    const view = await render(<AccountScreen />);

    expect(
      view.getByRole("header", { name: "Sicherheitsbereich" }),
    ).toBeTruthy();
    expect(
      view.getByRole("button", { name: "Auf allen Geräten abmelden" }),
    ).toBeTruthy();
    expect(view.getByRole("button", { name: "Abmelden" })).toBeTruthy();
  });

  it("shows a localized unavailable label when no app version is provided", async () => {
    const view = await render(<AccountScreen />);

    expect(view.getByText("App-Version: Nicht verfügbar")).toBeTruthy();
  });
});
