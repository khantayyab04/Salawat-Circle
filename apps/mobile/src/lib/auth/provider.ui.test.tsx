import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useEffect, useState } from "react";
import { Text, Pressable } from "react-native";
import type { AuthGateway } from "./auth-coordinator";
import { AuthProvider, useAuth } from "./provider";

const mockSecureStoreValues = new Map<string, string>();
let inviteCallbackDependencyRuns = 0;

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(
    async (key: string) => mockSecureStoreValues.get(key) ?? null,
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStoreValues.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStoreValues.delete(key);
  }),
}));
jest.mock("@/lib/reminder/expo-reminder-cleanup", () => ({
  clearExpoReminderForLogout: jest.fn(async () => undefined),
}));
jest.mock("@/lib/offline", () => ({
  clearAllOfflineData: jest.fn(async () => undefined),
}));

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

function InviteCallbackConsumer() {
  const auth = useAuth();

  useEffect(() => {
    inviteCallbackDependencyRuns += 1;
  }, [
    auth.clearPendingInvite,
    auth.peekPendingInvite,
    auth.rememberInvite,
  ]);

  return (
    <>
      <Text>{auth.status}</Text>
      <Text testID="auth-busy">{auth.busy ? "busy" : "idle"}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="request"
        onPress={() => auth.requestOtp("person@example.com")}
      />
    </>
  );
}

function InviteLifecycleConsumer() {
  const auth = useAuth();
  const [inviteState, setInviteState] = useState("unknown");

  return (
    <>
      <Text>{auth.status}</Text>
      <Text testID="invite-state">{inviteState}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="remember-invite"
        onPress={() => {
          void auth
            .rememberInvite("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
            .then(() => setInviteState("remembered"));
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="sign-out"
        onPress={() => {
          void auth.signOut();
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="peek-invite"
        onPress={() => {
          void auth
            .peekPendingInvite()
            .then((token) => setInviteState(token ?? "empty"));
        }}
      />
    </>
  );
}

beforeEach(() => {
  mockSecureStoreValues.clear();
  inviteCallbackDependencyRuns = 0;
});

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
      signOutEverywhere: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
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
      signOutEverywhere: jest.fn<() => Promise<void>>(),
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

  it("keeps invite-store callback identities stable across auth state updates", async () => {
    const gateway: AuthGateway = {
      getCurrentUser: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      requestOtp: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      verifyOtp: jest.fn<() => Promise<{ id: string }>>(),
      getOnboardingState: jest.fn<
        () => Promise<{ profileComplete: boolean; consentGranted: boolean }>
      >(),
      upsertProfile: jest.fn<() => Promise<void>>(),
      grantConsent: jest.fn<() => Promise<void>>(),
      signOut: jest.fn<() => Promise<void>>(),
      signOutEverywhere: jest.fn<() => Promise<void>>(),
    };
    const view = await render(
      <AuthProvider gateway={gateway} clearLocalData={async () => undefined}>
        <InviteCallbackConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(view.getByText("signed_out")).toBeTruthy());
    await waitFor(() => expect(view.getByTestId("auth-busy").children).toEqual(["idle"]));
    const dependencyRunsBeforeRequest = inviteCallbackDependencyRuns;

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "request" }));
    });

    await waitFor(() => expect(gateway.requestOtp).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view.getByTestId("auth-busy").children).toEqual(["idle"]));
    expect(inviteCallbackDependencyRuns).toBe(dependencyRunsBeforeRequest);
  });

  it("clears a pending invite when logout uses injected account cleanup", async () => {
    const gateway: AuthGateway = {
      getCurrentUser: jest
        .fn<() => Promise<{ id: string }>>()
        .mockResolvedValue({ id: "user-1" }),
      requestOtp: jest.fn<() => Promise<void>>(),
      verifyOtp: jest.fn<() => Promise<{ id: string }>>(),
      getOnboardingState: jest
        .fn<() => Promise<{ profileComplete: boolean; consentGranted: boolean }>>()
        .mockResolvedValue({ profileComplete: true, consentGranted: true }),
      upsertProfile: jest.fn<() => Promise<void>>(),
      grantConsent: jest.fn<() => Promise<void>>(),
      signOut: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      signOutEverywhere: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const clearAccountData = jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined);
    const view = await render(
      <AuthProvider gateway={gateway} clearLocalData={clearAccountData}>
        <InviteLifecycleConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "remember-invite" }));
    });
    await waitFor(() =>
      expect(view.getByTestId("invite-state").children).toEqual(["remembered"]),
    );

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "sign-out" }));
    });
    await waitFor(() => expect(view.getByText("signed_out")).toBeTruthy());
    expect(clearAccountData).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "peek-invite" }));
    });
    await waitFor(() =>
      expect(view.getByTestId("invite-state").children).toEqual(["empty"]),
    );
  });

  it("clears the active local reminder as part of default logout cleanup", async () => {
    const { clearExpoReminderForLogout } = jest.requireMock(
      "@/lib/reminder/expo-reminder-cleanup",
    ) as {
      clearExpoReminderForLogout: jest.MockedFunction<
        () => Promise<void>
      >;
    };
    clearExpoReminderForLogout.mockClear();
    const gateway: AuthGateway = {
      getCurrentUser: jest
        .fn<() => Promise<{ id: string }>>()
        .mockResolvedValue({ id: "user-1" }),
      requestOtp: jest.fn<AuthGateway["requestOtp"]>(),
      verifyOtp: jest.fn<AuthGateway["verifyOtp"]>(),
      getOnboardingState: jest.fn(async () => ({
        profileComplete: true,
        consentGranted: true,
      })),
      upsertProfile: jest.fn<AuthGateway["upsertProfile"]>(),
      grantConsent: jest.fn<AuthGateway["grantConsent"]>(),
      signOut: jest.fn(async () => undefined),
      signOutEverywhere: jest.fn(async () => undefined),
    };
    const view = await render(
      <AuthProvider gateway={gateway} clearLocalData={async () => undefined}>
        <InviteLifecycleConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "sign-out" }));
    });
    await waitFor(() =>
      expect(clearExpoReminderForLogout).toHaveBeenCalledTimes(1),
    );
  });
});
