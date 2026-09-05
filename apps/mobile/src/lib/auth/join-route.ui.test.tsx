import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import JoinRoute from "@/app/join/[token]";

let mockStatus = "signed_out";
let mockTokenParam: string | string[] | undefined =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const mockRememberInvite = jest.fn<(token: string) => Promise<void>>();
const mockReplace = jest.fn();

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    status: mockStatus,
    rememberInvite: mockRememberInvite,
  }),
}));
jest.mock("@/ui", () => {
  const { Pressable, Text, View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    AppButton: ({
      label,
      onPress,
    }: {
      label: string;
      onPress?: () => void;
    }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
    AppScreen: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    StateFeedback: () => <Text>invite-storage-error</Text>,
  };
});
jest.mock("@/localization", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/screens/groups", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return { JoinScreen: () => <Text>join-preview</Text> };
});
jest.mock("expo-router", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    Redirect: ({ href }: { href: string }) => <Text>{href}</Text>,
    useLocalSearchParams: () => ({ token: mockTokenParam }),
    useRouter: () => ({ replace: mockReplace }),
  };
});
jest.mock("expo-router/stack", () => ({
  Stack: { Screen: () => null },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = "signed_out";
  mockTokenParam = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  mockRememberInvite.mockResolvedValue(undefined);
});

describe("MVP08 join route", () => {
  it("stores a pre-auth invite and returns to the auth state router", async () => {
    const view = await render(<JoinRoute />);

    await waitFor(() =>
      expect(mockRememberInvite).toHaveBeenCalledWith(
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ),
    );
    expect(view.getByText("/")).toBeTruthy();
  });

  it("persists a ready user's token before keeping the join preview reachable", async () => {
    mockStatus = "ready";
    let finishPersistence!: () => void;
    mockRememberInvite.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishPersistence = resolve;
        }),
    );
    const view = await render(<JoinRoute />);

    await waitFor(() =>
      expect(mockRememberInvite).toHaveBeenCalledWith(
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ),
    );
    expect(view.queryByText("join-preview")).toBeNull();

    await act(async () => {
      finishPersistence();
    });

    await waitFor(() => expect(view.getByText("join-preview")).toBeTruthy());
  });

  it("retries failed ready-user persistence before rendering the join preview", async () => {
    mockStatus = "ready";
    let finishRetry!: () => void;
    mockRememberInvite.mockRejectedValueOnce(new Error("keychain unavailable"));
    mockRememberInvite.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRetry = resolve;
        }),
    );
    const view = await render(<JoinRoute />);

    await waitFor(() =>
      expect(view.getByText("invite-storage-error")).toBeTruthy(),
    );
    expect(view.queryByText("join-preview")).toBeNull();

    fireEvent.press(view.getByText("joinStorageRetry"));

    await waitFor(() => expect(mockRememberInvite).toHaveBeenCalledTimes(2));
    expect(view.queryByText("join-preview")).toBeNull();

    await act(async () => {
      finishRetry();
    });

    await waitFor(() => expect(view.getByText("join-preview")).toBeTruthy());
  });

  it("lets a ready user leave safely after invite persistence fails", async () => {
    mockStatus = "ready";
    mockRememberInvite.mockRejectedValueOnce(new Error("keychain unavailable"));
    const view = await render(<JoinRoute />);

    await waitFor(() =>
      expect(view.getByText("invite-storage-error")).toBeTruthy(),
    );

    fireEvent.press(view.getByText("joinExitAction"));

    expect(mockReplace).toHaveBeenCalledWith("/today");
    expect(view.queryByText("join-preview")).toBeNull();
  });

  it("waits for session restoration before deciding to persist an invite", async () => {
    mockStatus = "loading";
    const view = await render(<JoinRoute />);

    expect(view.toJSON()).toBeNull();
    expect(mockRememberInvite).not.toHaveBeenCalled();
  });

  it.each(["signed_out", "profile_required", "consent_required"])(
    "does not discard an invite when secure storage is unavailable for %s users",
    async (status) => {
      mockStatus = status;
      mockRememberInvite.mockRejectedValueOnce(new Error("keychain unavailable"));
      const view = await render(<JoinRoute />);

      await waitFor(() =>
        expect(view.getByText("invite-storage-error")).toBeTruthy(),
      );
      expect(view.queryByText("/")).toBeNull();
      expect(view.queryByText("join-preview")).toBeNull();
    },
  );

  it("ignores invalid or ambiguous token params without persisting secrets", async () => {
    mockTokenParam = [
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    ];

    const view = await render(<JoinRoute />);

    await waitFor(() => expect(view.getByText("/")).toBeTruthy());
    expect(mockRememberInvite).not.toHaveBeenCalled();
  });
});
