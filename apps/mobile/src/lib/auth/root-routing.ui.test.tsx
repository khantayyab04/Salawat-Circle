import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import IndexRoute from "@/app/index";

let mockStatus = "signed_out";

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ status: mockStatus }),
}));
jest.mock("@/components", () => {
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    AppScreen: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    StateFeedback: () => <View />,
  };
});
jest.mock("expo-router", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return { Redirect: ({ href }: { href: string }) => <Text>{href}</Text> };
});

describe("MVP03 root auth routing", () => {
  it.each([
    ["signed_out", "/welcome"],
    ["profile_required", "/onboarding/profile"],
    ["consent_required", "/onboarding/consent"],
    ["ready", "/today"],
  ])("routes %s to %s", async (nextStatus, expectedRoute) => {
    mockStatus = nextStatus;
    const view = await render(<IndexRoute />);
    expect(view.getByText(expectedRoute)).toBeTruthy();
  });
});
