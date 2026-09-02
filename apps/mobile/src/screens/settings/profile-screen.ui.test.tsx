import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProfileSettingsScreen } from "./profile-screen";

const mockSaveProfile = jest.fn<
  (displayName: string, timeZone: string, locale: "de" | "en") => Promise<void>
>();
let mockAuthError: string | null = null;

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    busy: false,
    errorCode: mockAuthError,
    saveProfile: mockSaveProfile,
    clearError: jest.fn(),
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
    Picker,
  };
});
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    locale: "de",
    t: (key: string) =>
      ({
        profileNameLabel: "Anzeigename",
        profileNameHint: "Zwischen 2 und 30 Zeichen.",
        profileTimezoneLabel: "Zeitzone",
        profileTimezoneHint: "Zeitzone auswählen",
        settingsProfileSave: "Profil speichern",
        profileSaveFailed: "Das Profil konnte nicht gespeichert werden.",
      })[key] ?? key,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthError = null;
  mockSaveProfile.mockResolvedValue(undefined);
});

describe("ProfileSettingsScreen", () => {
  it("loads the saved profile and submits an edited display name", async () => {
    const view = await render(
      <ProfileSettingsScreen
        gateway={{
          loadProfile: async () => ({
            displayName: "Amina Example",
            timeZone: "Europe/Berlin",
          }),
        }}
      />,
    );

    await waitFor(() =>
      expect(view.getByDisplayValue("Amina Example")).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.changeText(view.getByDisplayValue("Amina Example"), "Amina Noor");
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Profil speichern" }));
    });

    expect(mockSaveProfile).toHaveBeenCalledWith(
      "Amina Noor",
      "Europe/Berlin",
      "de",
    );
  });

  it("shows a stable save error returned by the auth provider", async () => {
    mockAuthError = "PROFILE_SAVE_FAILED";
    const view = await render(
      <ProfileSettingsScreen
        gateway={{
          loadProfile: async () => ({
            displayName: "Amina Example",
            timeZone: "Europe/Berlin",
          }),
        }}
      />,
    );

    await waitFor(() =>
      expect(
        view.getByText("Das Profil konnte nicht gespeichert werden."),
      ).toBeTruthy(),
    );
  });
});
