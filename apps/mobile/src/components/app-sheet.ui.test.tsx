import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";
import { AppSheet } from "./app-sheet";

// Native presentation is the boundary under test; keep its chosen animation
// and dismissal callbacks visible while rendering the real sheet contents.
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: ({ children, ...props }: import("react-native").ModalProps) => (
      <View {...props} testID="native-sheet">{children}</View>
    ),
  };
});

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return { ...actual, useAppTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

describe("AppSheet", () => {
  it("prevents backdrop and back dismissal while a write is pending", async () => {
    const close = jest.fn();
    const view = await render(
      <AppSheet title="Änderung" closeLabel="Schließen" visible dismissible={false} onClose={close}>
        <Text>Wird gespeichert</Text>
      </AppSheet>,
    );
    await fireEvent(view.getByTestId("native-sheet"), "requestClose");
    for (const button of view.getAllByRole("button", { name: "Schließen" })) await fireEvent.press(button);
    expect(close).not.toHaveBeenCalled();
  });

  it("honors the system reduced-motion preference when presenting a form", async () => {
    const preference = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const view = await render(
      <AppSheet title="Tagesziel" closeLabel="Schließen" visible onClose={() => {}}>
        <Text>Zielwert</Text>
      </AppSheet>,
    );
    await act(async () => {});
    expect(view.getByTestId("native-sheet").props.animationType).toBe("fade");
    preference.mockRestore();
  });
});
