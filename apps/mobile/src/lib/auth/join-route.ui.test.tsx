import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, waitFor } from "@testing-library/react-native";
import JoinRoute from "@/app/join/[token]";

let mockStatus = "signed_out";
let mockTokenParam: string | string[] | undefined =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const mockRememberInvite = jest.fn<(token: string) => Promise<void>>();

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    status: mockStatus,
    rememberInvite: mockRememberInvite,
  }),
}));
jest.mock("@/components", () => {
  const { Text, View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    AppScreen: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    StateFeedback: () => <Text>invite-storage-error</Text>,
  };
});
jest.mock("@/localization", () => ({
  useTranslation: () => ({ t: () => "Einladung" }),
}));
jest.mock("@/screens/main", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return { JoinScreen: () => <Text>join-preview</Text> };
});
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

describe("MVP03 join route", () => {
  it("stores a pre-auth invite and returns to the auth state router", async () => {
    const view = await render(<JoinRoute />);

    await waitFor(() =>
      expect(mockRememberInvite).toHaveBeenCalledWith(
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ),
    );
    expect(view.getByText("/")).toBeTruthy();
  });

  it("keeps the join placeholder reachable for ready users", async () => {
    mockStatus = "ready";
    const view = await render(<JoinRoute />);

    expect(view.getByText("join-preview")).toBeTruthy();
    expect(mockRememberInvite).not.toHaveBeenCalled();
  });

  it("waits for session restoration before deciding to persist an invite", async () => {
    mockStatus = "loading";
    const view = await render(<JoinRoute />);

    expect(view.toJSON()).toBeNull();
    expect(mockRememberInvite).not.toHaveBeenCalled();
  });

  it("does not discard an invite when secure storage is unavailable", async () => {
    mockRememberInvite.mockRejectedValueOnce(new Error("keychain unavailable"));
    const view = await render(<JoinRoute />);

    await waitFor(() =>
      expect(view.getByText("invite-storage-error")).toBeTruthy(),
    );
    expect(view.queryByText("/")).toBeNull();
  });

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
