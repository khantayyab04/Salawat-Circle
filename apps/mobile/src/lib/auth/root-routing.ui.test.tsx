import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import IndexRoute from "@/app/index";

let mockStatus = "signed_out";
const mockPeekPendingInvite = jest.fn<() => Promise<string | null>>();
const mockRedirect = jest.fn();

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    status: mockStatus,
    peekPendingInvite: mockPeekPendingInvite,
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
    StateFeedback: ({ state }: { state: string }) => <Text>{state}</Text>,
  };
});
jest.mock("@/localization", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("expo-router", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    Redirect: ({
      href,
    }: {
      href: string | { pathname: string; params: { token: string } };
    }) => {
      mockRedirect(href);
      return <Text>{typeof href === "string" ? href : href.pathname}</Text>;
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = "signed_out";
  mockPeekPendingInvite.mockResolvedValue(null);
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_LOCAL_DEMO;
});

describe("MVP03 root auth routing", () => {
  it.each([
    ["signed_out", "/welcome"],
    ["profile_required", "/onboarding"],
    ["consent_required", "/onboarding"],
  ])("routes %s to %s", async (nextStatus, expectedRoute) => {
    mockStatus = nextStatus;
    const view = await render(<IndexRoute />);
    expect(view.getByText(expectedRoute)).toBeTruthy();
  });

  it("opens the private UI preview without authentication in local development", async () => {
    process.env.EXPO_PUBLIC_LOCAL_DEMO = "true";
    mockStatus = "signed_out";

    const view = await render(<IndexRoute />);

    expect(view.getByText("/today")).toBeTruthy();
  });

  it("routes a restored ready session without a pending invite to today", async () => {
    mockStatus = "ready";
    mockPeekPendingInvite.mockResolvedValueOnce(null);

    const view = await render(<IndexRoute />);

    await waitFor(() => expect(view.getByText("/today")).toBeTruthy());
  });

  it("routes a restored ready session with a pending invite back to the join route", async () => {
    mockStatus = "ready";
    mockPeekPendingInvite.mockResolvedValueOnce(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    const view = await render(<IndexRoute />);

    await waitFor(() => expect(view.getByText("/join/[token]")).toBeTruthy());
    expect(mockRedirect).toHaveBeenLastCalledWith({
      pathname: "/join/[token]",
      params: { token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
  });

  it("keeps routing blocked and retries when pending invite storage cannot be read", async () => {
    const token = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    let finishRetry!: () => void;
    mockStatus = "ready";
    mockPeekPendingInvite.mockRejectedValueOnce(
      new Error(`storage failed for ${token}`),
    );
    mockPeekPendingInvite.mockImplementationOnce(
      () =>
        new Promise<null>((resolve) => {
          finishRetry = () => resolve(null);
        }),
    );

    const view = await render(<IndexRoute />);

    await waitFor(() => expect(view.getByText("error")).toBeTruthy());
    expect(view.queryByText("/today")).toBeNull();
    expect(view.queryByText(token)).toBeNull();

    await act(async () => {
      fireEvent.press(view.getByText("joinStorageRetry"));
    });

    await waitFor(() => expect(mockPeekPendingInvite).toHaveBeenCalledTimes(2));
    expect(view.getByText("loading")).toBeTruthy();

    await act(async () => {
      finishRetry();
    });

    await waitFor(() => expect(view.getByText("/today")).toBeTruthy());
  });
});
