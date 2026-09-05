import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { AppButton } from "./app-button";
import { FormField } from "./form-field";
import { StateFeedback, type ViewState } from "./state-feedback";

jest.mock("@/localization", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

describe("AppButton", () => {
  it("provides an accessible 48dp primary action with pressed behavior", async () => {
    const onPress = jest.fn();
    const view = await render(
      <AppButton label="Eintragen" onPress={onPress} />,
    );
    const button = view.getByRole("button", { name: "Eintragen" });

    // The requirement is a comfortable touch target, not one exact height.
    expect(
      button.props.style.find(
        (entry: { minHeight?: number }) => entry?.minHeight !== undefined,
      ).minHeight,
    ).toBeGreaterThanOrEqual(44);
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not invoke disabled actions", async () => {
    const onPress = jest.fn();
    const view = await render(
      <AppButton disabled label="Eintragen" onPress={onPress} />,
    );
    const button = view.getByRole("button", { name: "Eintragen" });

    expect(button.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("FormField", () => {
  it("connects its visible label and hint to a 48dp input", async () => {
    const view = await render(
      <FormField
        hint="Wir senden dir einen einmaligen Code."
        label="E-Mail-Adresse"
      />,
    );
    const input = view.getByLabelText("E-Mail-Adresse");

    expect(input).toHaveStyle({ minHeight: 48 });
    expect(input.props.accessibilityHint).toBe(
      "Wir senden dir einen einmaligen Code.",
    );
  });
});

describe("StateFeedback", () => {
  const blockingStates: ViewState[] = [
    "loading",
    "empty",
    "offlineEmpty",
    "error",
    "forbidden",
    "sessionExpired",
    "maintenance",
    "upgradeRequired",
  ];

  it.each(blockingStates)("renders %s as a complete state", async (state) => {
    const view = await render(
      <StateFeedback state={state}>
        <Text>content</Text>
      </StateFeedback>,
    );

    expect(view.queryByText("content")).toBeNull();
    expect(view.getByRole("alert")).toBeTruthy();
  });

  it.each(["offlineWithData", "pending", "partialError"] as const)(
    "keeps content visible for %s and adds a status",
    async (state) => {
      const view = await render(
        <StateFeedback state={state}>
          <Text>content</Text>
        </StateFeedback>,
      );

      expect(view.getByText("content")).toBeTruthy();
      expect(view.getByRole("alert")).toBeTruthy();
    },
  );

  it("renders content without status chrome", async () => {
    const view = await render(
      <StateFeedback state="content">
        <Text>content</Text>
      </StateFeedback>,
    );

    expect(view.getByText("content")).toBeTruthy();
    expect(view.queryByRole("alert")).toBeNull();
  });
});
