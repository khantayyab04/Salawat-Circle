import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { CodeScreen, ConsentScreen, EmailScreen } from "./index";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRequestOtp = jest.fn<() => Promise<void>>();
const mockVerifyOtp = jest.fn<() => Promise<string>>();
const mockGrantConsent = jest.fn<() => Promise<string | null>>();
const mockConsumePendingInvite = jest.fn<() => Promise<string | null>>();
const mockClearError = jest.fn();
let mockStatus:
  | "loading"
  | "signed_out"
  | "profile_required"
  | "consent_required"
  | "ready" = "consent_required";
let mockPendingEmail: string | null = "person@example.com";

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
    saveProfile: jest.fn(),
    grantConsent: mockGrantConsent,
    signOut: jest.fn(),
    rememberInvite: jest.fn(),
    consumePendingInvite: mockConsumePendingInvite,
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
        commonContinue: "Weiter",
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
  mockStatus = "consent_required";
  mockPendingEmail = "person@example.com";
  mockRequestOtp.mockResolvedValue(undefined);
  mockVerifyOtp.mockResolvedValue("consent_required");
  mockGrantConsent.mockResolvedValue(null);
  mockConsumePendingInvite.mockResolvedValue(null);
});

describe("MVP03 auth screens", () => {
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

  it("routes OTP-ready users back to the invite preview when a pending token exists", async () => {
    mockStatus = "ready";
    mockVerifyOtp.mockResolvedValue("ready");
    mockConsumePendingInvite.mockResolvedValue(
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
    await waitFor(() => expect(mockConsumePendingInvite).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/join/[token]",
      params: { token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
  });

  it.each([
    "profile_required",
    "consent_required",
  ] as const)(
    "does not consume pending invites when verifyOtp returns %s",
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
      expect(mockConsumePendingInvite).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/");
    },
  );
});
