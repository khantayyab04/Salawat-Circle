import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { GoalSection } from "./goal-section";

const mockSetGoal = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockClearGoal = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.mock("@expo/ui", () => {
  const { Pressable } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    Slider: ({
      onValueChange,
    }: {
      onValueChange(value: number): void;
    }) => (
      <Pressable
        accessibilityLabel="Zielregler"
        accessibilityRole="adjustable"
        onPress={() => onValueChange(500)}
      />
    ),
  };
});
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        goalTitle: "Tagesziel",
        goalAmountLabel: "Zielwert",
        goalAmountHint: "1 bis 10.000.000",
        goalSave: "Ziel speichern",
        goalClear: "Ziel deaktivieren",
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

describe("GoalSection", () => {
  it("keeps the slider and exact target field coupled before saving", async () => {
    const view = await render(
      <GoalSection
        busy={false}
        goal="100"
        onClear={mockClearGoal}
        onSave={mockSetGoal}
      />,
    );

    await act(async () => {
      fireEvent.press(view.getByRole("adjustable", { name: "Zielregler" }));
    });
    expect(view.getByDisplayValue("500")).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(view.getByLabelText("Zielwert"), "777");
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Ziel speichern" }));
    });

    expect(mockSetGoal).toHaveBeenCalledWith(777);
  });
});
