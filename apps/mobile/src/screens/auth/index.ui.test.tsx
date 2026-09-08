import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  CodeScreen,
  ConsentScreen,
  EmailScreen,
  ProfileOnboardingScreen,
  WelcomeScreen,
} from "./index";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRequestOtp = jest.fn<() => Promise<void>>();
const mockVerifyOtp = jest.fn<() => Promise<string>>();
const mockGrantConsent = jest.fn<() => Promise<void>>();
const mockSaveProfile = jest.fn<
  (displayName: string, timeZone: string, locale: "de" | "en") => Promise<void>
>();
const mockPeekPendingInvite = jest.fn<() => Promise<string | null>>();
const mockClearError = jest.fn();
let mockStatus:
  | "loading"
  | "signed_out"
  | "profile_required"
  | "consent_required"
  | "ready" = "consent_required";
let mockPendingEmail: string | null = "person@example.com";
let mockDarkMode = false;

jest.mock("lucide-react-native/icons/heart", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: ({ color }: { color: string }) => <Text testID="welcome-heart">{color}</Text>,
  };
});

jest.mock("expo-router", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    Redirect: ({ href }: { href: string }) => <Text>{href}</Text>,
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
  };
});
jest.mock("@expo/ui", () => {
  const { Pressable } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    Checkbox: ({
      value,
      onValueChange,
      label,
    }: {
      value: boolean;
      onValueChange(value: boolean): void;
      label: string;
    }) => (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        onPress={() => onValueChange(!value)}
      />
    ),
  };
});
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    status: mockStatus,
    pendingEmail: mockPendingEmail,
    nextOtpRequestAt: null,
    busy: false,
    errorCode: null,
    requestOtp: mockRequestOtp,
    verifyOtp: mockVerifyOtp,
    saveProfile: mockSaveProfile,
    grantConsent: mockGrantConsent,
    signOut: jest.fn(),
    rememberInvite: jest.fn(),
    peekPendingInvite: mockPeekPendingInvite,
    clearError: mockClearError,
  }),
}));
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    locale: "de",
    localeTag: "de-DE",
    t: (key: string) =>
      ({
        authEmailLabel: "E-Mail-Adresse",
        authEmailHint: "Wir senden dir einen einmaligen Anmeldecode.",
        authEmailAction: "Weiter zum Code",
        authCodeLabel: "Sechsstelliger Code",
        authCodeHint: "Der Code ist zehn Minuten gültig.",
        authCodeAction: "Code prüfen",
        authCodeResend: "Neuen Code anfordern",
        authCodeResendIn: "Erneut anfordern in",
        consentLabel: "Ich willige ein.",
        consentBody: "Verarbeitungszweck und getrennte Gruppenteilung.",
        consentHint: "Die Gruppenteilung bleibt freiwillig.",
        profileNameLabel: "Anzeigename",
        profileNameHint: "Zwischen 2 und 30 Zeichen.",
        profileNameInvalid: "Gib einen gültigen Anzeigenamen ein.",
        profileTimezoneLabel: "Zeitzone",
        profileTimezoneHint: "Automatisch erkannt.",
        commonContinue: "Weiter",
      })[key] ?? key,
  }),
}));
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: mockDarkMode ? actual.darkColors : actual.lightColors, isDark: mockDarkMode }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestOtp.mockReset();
  mockStatus = "consent_required";
  mockPendingEmail = "person@example.com";
  mockDarkMode = false;
  mockRequestOtp.mockResolvedValue(undefined);
  mockVerifyOtp.mockResolvedValue("consent_required");
  mockGrantConsent.mockResolvedValue(undefined);
  mockSaveProfile.mockReset();
  mockSaveProfile.mockResolvedValue(undefined);
  mockPeekPendingInvite.mockResolvedValue(null);
});

describe("MVP03 auth screens", () => {
  it("keeps the welcome mark readable on the dark green surface", async () => {
    mockDarkMode = true;

    const view = await render(<WelcomeScreen />);

    expect(view.getByTestId("welcome-heart")).toHaveTextContent("#04241A");
  });

  it("does not request a second OTP while the first email submission is pending", async () => {
    mockRequestOtp.mockImplementationOnce(() => new Promise<void>(() => undefined));
    const view = await render(<EmailScreen />);
    fireEvent.changeText(
      view.getByLabelText("E-Mail-Adresse"),
      "person@example.com",
    );
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Weiter zum Code" }).props
          .accessibilityState.disabled,
      ).toBe(false),
    );
    const action = view.getByRole("button", { name: "Weiter zum Code" });

    await fireEvent.press(action);
    await fireEvent.press(action);

    expect(mockRequestOtp).toHaveBeenCalledTimes(1);
  });

  it("does not resend a second OTP while the first resend is pending", async () => {
    mockRequestOtp.mockImplementationOnce(() => new Promise<void>(() => undefined));
    const view = await render(<CodeScreen />);
    const resend = view.getByRole("button", { name: "Neuen Code anfordern" });

    await fireEvent.press(resend);
    await fireEvent.press(resend);

    expect(mockRequestOtp).toHaveBeenCalledTimes(1);
  });

  it("validates email before requesting an OTP and navigating", async () => {
    const view = await render(<EmailScreen />);
    const action = view.getByRole("button", { name: "Weiter zum Code" });
    expect(action.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(view.getByLabelText("E-Mail-Adresse"), "person@example.com");
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Weiter zum Code" }).props
          .accessibilityState.disabled,
      ).toBe(false),
    );
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Weiter zum Code" }));
    });

    await waitFor(() =>
      expect(mockRequestOtp).toHaveBeenCalledWith("person@example.com"),
    );
    expect(mockPush).toHaveBeenCalledWith("/auth/code");
  });

  it("requires an explicit unchecked consent before continuing", async () => {
    const view = await render(<ConsentScreen />);
    expect(
      view.getByText("Verarbeitungszweck und getrennte Gruppenteilung."),
    ).toBeTruthy();
    expect(
      view.getByRole("button", { name: "Weiter" }).props.accessibilityState
        .disabled,
    ).toBe(true);

    await act(async () => {
      fireEvent.press(view.getByRole("checkbox", { name: "Ich willige ein." }));
    });
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Weiter" }).props.accessibilityState
          .disabled,
      ).toBe(false),
    );
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Weiter" }));
    });

    await waitFor(() => expect(mockGrantConsent).toHaveBeenCalledWith("de"));
    expect(mockReplace).toHaveBeenCalledWith("/today");
  });

  it("does not grant consent twice while submission is pending", async () => {
    mockGrantConsent.mockImplementationOnce(() => new Promise<void>(() => undefined));
    const view = await render(<ConsentScreen />);
    await fireEvent.press(
      view.getByRole("checkbox", { name: "Ich willige ein." }),
    );
    const action = view.getByRole("button", { name: "Weiter" });

    await fireEvent.press(action);
    await fireEvent.press(action);

    expect(mockGrantConsent).toHaveBeenCalledTimes(1);
  });

  it("does not save the onboarding profile twice while submission is pending", async () => {
    mockStatus = "profile_required";
    mockSaveProfile.mockImplementationOnce(() => new Promise<void>(() => undefined));
    const view = await render(<ProfileOnboardingScreen />);
    await fireEvent.changeText(view.getByLabelText("Anzeigename"), "Amina");
    const action = view.getByRole("button", { name: "Weiter" });

    await fireEvent.press(action);
    await fireEvent.press(action);

    expect(mockSaveProfile).toHaveBeenCalledTimes(1);
  });

  it("routes consent completion with a non-destructive pending-invite peek", async () => {
    mockPeekPendingInvite.mockResolvedValue(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    const view = await render(<ConsentScreen />);
    await act(async () => {
      fireEvent.press(view.getByRole("checkbox", { name: "Ich willige ein." }));
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Weiter" }));
    });

    await waitFor(() => expect(mockGrantConsent).toHaveBeenCalledWith("de"));
    await waitFor(() => expect(mockPeekPendingInvite).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/join/[token]",
      params: { token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
  });

  it("routes OTP-ready users with a non-destructive pending-invite peek", async () => {
    mockStatus = "ready";
    mockVerifyOtp.mockResolvedValue("ready");
    mockPeekPendingInvite.mockResolvedValue(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    const view = await render(<CodeScreen />);
    fireEvent.changeText(view.getByLabelText("Sechsstelliger Code"), "123456");
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Code prüfen" }).props.accessibilityState
          .disabled,
      ).toBe(false),
    );
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Code prüfen" }));
    });

    await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledWith("123456"));
    await waitFor(() => expect(mockPeekPendingInvite).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/join/[token]",
      params: { token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
  });

  it.each([
    "profile_required",
    "consent_required",
  ] as const)(
    "does not read pending invites before %s onboarding completes",
    async (nextStatus) => {
      mockStatus = nextStatus;
      mockVerifyOtp.mockResolvedValue(nextStatus);

      const view = await render(<CodeScreen />);
      fireEvent.changeText(view.getByLabelText("Sechsstelliger Code"), "123456");
      await waitFor(() =>
        expect(
          view.getByRole("button", { name: "Code prüfen" }).props.accessibilityState
            .disabled,
        ).toBe(false),
      );

      await act(async () => {
        fireEvent.press(view.getByRole("button", { name: "Code prüfen" }));
      });

      await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledWith("123456"));
      expect(mockPeekPendingInvite).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/");
    },
  );
});
