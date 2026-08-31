import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthCoordinator,
  type AuthGateway,
  type AuthStatus,
} from "./auth-coordinator";
import { createPendingInviteStore } from "./pending-invite";
import {
  clearSecureAuthSession,
  getSupabaseClient,
} from "./supabase-client";
import {
  createSupabaseAuthGateway,
} from "./supabase-gateway";

type AuthContextValue = {
  status: AuthStatus;
  pendingEmail: string | null;
  nextOtpRequestAt: number | null;
  busy: boolean;
  errorCode: string | null;
  requestOtp(email: string): Promise<void>;
  verifyOtp(token: string): Promise<void>;
  saveProfile(
    displayName: string,
    timeZone: string,
    locale: "de" | "en",
  ): Promise<void>;
  grantConsent(locale: "de" | "en"): Promise<string | null>;
  signOut(): Promise<void>;
  rememberInvite(token: string): Promise<void>;
  consumePendingInvite(): Promise<string | null>;
  clearError(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function createUnavailableGateway(): AuthGateway {
  const unavailable = async () => {
    throw new Error("BACKEND_UNAVAILABLE");
  };
  return {
    getCurrentUser: async () => null,
    requestOtp: unavailable,
    verifyOtp: unavailable,
    getOnboardingState: unavailable,
    upsertProfile: unavailable,
    grantConsent: unavailable,
    signOut: async () => undefined,
  };
}

function createDefaultGateway() {
  try {
    return createSupabaseAuthGateway(getSupabaseClient());
  } catch {
    return createUnavailableGateway();
  }
}

export function AuthProvider({
  children,
  gateway: providedGateway,
  clearLocalData: providedClearLocalData,
}: PropsWithChildren<{
  gateway?: AuthGateway;
  clearLocalData?: () => Promise<void>;
}>) {
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const inviteStore = useMemo(
    () => createPendingInviteStore(SecureStore),
    [],
  );
  const gateway = useMemo(
    () => providedGateway ?? createDefaultGateway(),
    [providedGateway],
  );
  const clearLocalData = useMemo(
    () =>
      providedClearLocalData ??
      (async () => {
        await Promise.all([clearSecureAuthSession(), inviteStore.clear()]);
      }),
    [inviteStore, providedClearLocalData],
  );
  const coordinator = useMemo(
    () => new AuthCoordinator(gateway, clearLocalData),
    [clearLocalData, gateway],
  );
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    void coordinator
      .bootstrap()
      .catch(() => {
        coordinator.snapshot.status = "signed_out";
        setErrorCode("BACKEND_UNAVAILABLE");
      })
      .finally(() => {
        if (active) refresh();
      });
    return () => {
      active = false;
    };
  }, [coordinator, refresh]);

  useEffect(() => {
    let active = true;
    const unsubscribe = gateway.subscribeToAuthChanges?.(() => {
      void coordinator
        .bootstrap()
        .catch(() => {
          coordinator.snapshot.status = "signed_out";
          if (active) setErrorCode("BACKEND_UNAVAILABLE");
        })
        .finally(() => {
          if (active) refresh();
        });
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [coordinator, gateway, refresh]);

  useEffect(() => {
    if (providedGateway) return;
    try {
      const client = getSupabaseClient();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      });
      return () => {
        subscription.remove();
        client.auth.stopAutoRefresh();
      };
    } catch {
      return;
    }
  }, [providedGateway]);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, fallbackCode: string) => {
      setBusy(true);
      setErrorCode(null);
      try {
        const result = await action();
        refresh();
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : fallbackCode;
        const code = message.startsWith("INVALID_") || message === "OTP_COOLDOWN"
          ? message
          : fallbackCode;
        setErrorCode(code);
        throw new Error(code);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const value = useMemo<AuthContextValue>(() => {
    void revision;
    return {
      status: coordinator.snapshot.status,
      pendingEmail: coordinator.snapshot.pendingEmail,
      nextOtpRequestAt: coordinator.snapshot.nextOtpRequestAt,
      busy,
      errorCode,
      requestOtp: (email) =>
        run(() => coordinator.requestOtp(email), "OTP_REQUEST_FAILED"),
      verifyOtp: (token) =>
        run(() => coordinator.verifyOtp(token), "OTP_INVALID"),
      saveProfile: (displayName, timeZone, locale) =>
        run(
          () => coordinator.saveProfile(displayName, timeZone, locale),
          "PROFILE_SAVE_FAILED",
        ),
      grantConsent: (locale) =>
        run(async () => {
          await coordinator.grantConsent(locale);
          return inviteStore.consume();
        }, "CONSENT_SAVE_FAILED"),
      signOut: () => run(() => coordinator.signOut(), "SIGN_OUT_FAILED"),
      rememberInvite: (token) => inviteStore.save(token),
      consumePendingInvite: () => inviteStore.consume(),
      clearError: () => setErrorCode(null),
    };
  }, [busy, coordinator, errorCode, inviteStore, revision, run]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
