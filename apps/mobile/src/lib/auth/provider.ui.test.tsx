import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text, Pressable } from "react-native";
import type { AuthGateway } from "./auth-coordinator";
import { AuthProvider, useAuth } from "./provider";

function TestConsumer() {
  const auth = useAuth();
  return (
    <>
      <Text>{auth.status}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="request"
        onPress={() => auth.requestOtp("person@example.com")}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="verify"
        onPress={() => auth.verifyOtp("123456")}
      />
    </>
  );
}

describe("AuthProvider", () => {
  it("boots signed out and exposes the verified onboarding state", async () => {
    const gateway: AuthGateway = {
      getCurrentUser: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      requestOtp: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      verifyOtp: jest
        .fn<() => Promise<{ id: string }>>()
        .mockResolvedValue({ id: "user-1" }),
      getOnboardingState: jest
        .fn<() => Promise<{ profileComplete: boolean; consentGranted: boolean }>>()
        .mockResolvedValue({ profileComplete: false, consentGranted: false }),
      upsertProfile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      grantConsent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      signOut: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };

    const view = await render(
      <AuthProvider gateway={gateway} clearLocalData={async () => undefined}>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(view.getByText("signed_out")).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "request" }));
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "verify" }));
    });
    await waitFor(() =>
      expect(view.getByText("profile_required")).toBeTruthy(),
    );
  });

  it("re-evaluates protected state after a session change", async () => {
    let listener: () => void = () => undefined;
    const getCurrentUser = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValueOnce({ id: "user-1" })
      .mockResolvedValueOnce(null);
    const gateway: AuthGateway = {
      subscribeToAuthChanges: (nextListener) => {
        listener = nextListener;
        return () => undefined;
      },
      getCurrentUser,
      requestOtp: jest.fn<() => Promise<void>>(),
      verifyOtp: jest.fn<() => Promise<{ id: string }>>(),
      getOnboardingState: jest
        .fn<() => Promise<{ profileComplete: boolean; consentGranted: boolean }>>()
        .mockResolvedValue({ profileComplete: true, consentGranted: true }),
      upsertProfile: jest.fn<() => Promise<void>>(),
      grantConsent: jest.fn<() => Promise<void>>(),
      signOut: jest.fn<() => Promise<void>>(),
    };
    const view = await render(
      <AuthProvider gateway={gateway} clearLocalData={async () => undefined}>
        <TestConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());

    await act(async () => listener());

    await waitFor(() => expect(view.getByText("signed_out")).toBeTruthy());
  });
});
