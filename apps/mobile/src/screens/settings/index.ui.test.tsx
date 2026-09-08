import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  LegalScreen,
  PrivacyScreen,
  SettingsScreen,
  SupportScreen,
} from "./index";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSignOut = jest.fn<() => Promise<void>>();
const mockSignOutEverywhere = jest.fn<() => Promise<void>>();
let mockFocusEffect: (() => void | (() => void)) | null = null;

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockFocusEffect = effect;
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    busy: false,
    errorCode: null,
    signOut: mockSignOut,
    signOutEverywhere: mockSignOutEverywhere,
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
        commonCancel: "Abbrechen",
        settingsSignOut: "Abmelden",
        settingsSignOutEverywhere: "Auf allen Geräten abmelden",
        settingsSignOutEverywhereConfirmTitle: "Auf allen Geräten abmelden?",
        settingsSignOutEverywhereConfirmBody:
          "Du wirst auf allen Geräten abgemeldet.",
        privacyOverviewTitle: "Deine Daten",
        legalGroupRulesTitle: "Achte auf die Gemeinschaft",
        supportReminderAction: "Erinnerung einrichten",
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
  mockFocusEffect = null;
  mockSignOut.mockResolvedValue(undefined);
  mockSignOutEverywhere.mockResolvedValue(undefined);
});

const profileGateway = {
  loadProfile: async () => ({
    displayName: "Amina",
    timeZone: "Europe/Berlin",
    locale: "de" as const,
  }),
};

describe("MVP03 settings", () => {
  it("does not show unfinished release placeholders in account settings", async () => {
    const privacy = await render(<PrivacyScreen />);
    const legal = await render(<LegalScreen />);
    const support = await render(<SupportScreen />);

    expect(privacy.queryByText("privacyAutomationUnavailableTitle")).toBeNull();
    expect(legal.queryByText("legalStatusTitle")).toBeNull();
    expect(support.queryByText("supportAvailabilityTitle")).toBeNull();
    expect(privacy.getByText("Deine Daten")).toBeTruthy();
    expect(legal.getByText("Achte auf die Gemeinschaft")).toBeTruthy();
  });

  it("explains the data that stays private", async () => {
    const view = await render(<PrivacyScreen />);

    expect(view.queryByRole("button", { name: "Daten exportieren" })).toBeNull();
    expect(view.queryByRole("button", { name: "Konto löschen" })).toBeNull();
    expect(view.getByText("Deine Daten")).toBeTruthy();
  });

  it("routes from self-help to the real reminder settings", async () => {
    const view = await render(<SupportScreen />);

    await fireEvent.press(
      view.getByRole("button", { name: "Erinnerung einrichten" }),
    );

    expect(mockPush).toHaveBeenCalledWith("/settings/reminder");
  });

  it("refreshes the account profile when focus returns after editing", async () => {
    const loadProfile = jest
      .fn<() => Promise<{ displayName: string; timeZone: string; locale: "de" }>>()
      .mockResolvedValueOnce({
        displayName: "Amina",
        timeZone: "Europe/Berlin",
        locale: "de",
      })
      .mockResolvedValueOnce({
        displayName: "Amina Noor",
        timeZone: "Europe/Berlin",
        locale: "de",
      });
    const view = await render(<SettingsScreen gateway={{ loadProfile }} />);

    await waitFor(() => expect(view.getByText("Amina")).toBeTruthy());
    expect(mockFocusEffect).not.toBeNull();

    await act(async () => {
      mockFocusEffect?.();
    });

    await waitFor(() => expect(view.getByText("Amina Noor")).toBeTruthy());
  });

  it("confirms before signing out and returns to the public welcome flow", async () => {
    const view = await render(<SettingsScreen gateway={profileGateway} />);

    // Signing out is confirmed in a sheet rather than fired straight away.
    await fireEvent.press(view.getByRole("button", { name: "Abmelden" }));
    expect(mockSignOut).not.toHaveBeenCalled();

    const [, confirm] = view.getAllByRole("button", { name: "Abmelden" });
    await fireEvent.press(confirm);

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith("/welcome");
  });

  it("offers revoking every session from the same confirmation", async () => {
    const view = await render(<SettingsScreen gateway={profileGateway} />);

    await fireEvent.press(view.getByRole("button", { name: "Abmelden" }));
    await fireEvent.press(
      view.getByRole("button", { name: "Auf allen Geräten abmelden" }),
    );

    await waitFor(() => expect(mockSignOutEverywhere).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith("/welcome");
  });

  it("can be dismissed without signing out", async () => {
    const view = await render(<SettingsScreen gateway={profileGateway} />);

    await fireEvent.press(view.getByRole("button", { name: "Abmelden" }));
    await fireEvent.press(view.getAllByRole("button", { name: "Abbrechen" })[0]);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockSignOutEverywhere).not.toHaveBeenCalled();
  });
});
