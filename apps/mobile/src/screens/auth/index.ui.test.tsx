import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ConsentScreen, EmailScreen } from "./index";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRequestOtp = jest.fn<() => Promise<void>>();
const mockGrantConsent = jest.fn<() => Promise<string | null>>();

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
    status: "consent_required",
    pendingEmail: "person@example.com",
    nextOtpRequestAt: null,
    busy: false,
    errorCode: null,
    requestOtp: mockRequestOtp,
    verifyOtp: jest.fn(),
    saveProfile: jest.fn(),
    grantConsent: mockGrantConsent,
    signOut: jest.fn(),
    rememberInvite: jest.fn(),
    consumePendingInvite: jest.fn(),
    clearError: jest.fn(),
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
  mockRequestOtp.mockResolvedValue(undefined);
  mockGrantConsent.mockResolvedValue(null);
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
    fireEvent.press(view.getByRole("button", { name: "Weiter zum Code" }));

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

    fireEvent.press(view.getByRole("checkbox", { name: "Ich willige ein." }));
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Weiter" }).props.accessibilityState
          .disabled,
      ).toBe(false),
    );
    fireEvent.press(view.getByRole("button", { name: "Weiter" }));

    await waitFor(() => expect(mockGrantConsent).toHaveBeenCalledWith("de"));
    expect(mockReplace).toHaveBeenCalledWith("/today");
  });
});
