import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render } from "@testing-library/react-native";
import { GroupManageScreen } from "./group-manage-screen";

const mockSetGroupGoal = jest.fn<() => Promise<unknown>>().mockResolvedValue({});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "group-1" }),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@/lib/groups", () => ({
  useGroups: () => ({
    groups: {
      items: [{ id: "group-1", role: "owner", revision: 4 }],
    },
    mutation: { pending: false },
    setGroupGoal: mockSetGroupGoal,
  }),
}));
jest.mock("@/lib/entries", () => ({
  parseEntryAmount: (value: string) => Number(value),
}));
jest.mock("@/localization", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        groupManage: "Gruppe verwalten",
        groupGoalSet: "Gruppenziel setzen",
        groupGoalWeek: "Woche",
        groupGoalMonth: "Monat",
        groupGoalAmount: "Zielwert",
        groupGoalSave: "Ziel speichern",
        groupGoalSaveFailed: "Das Gruppenziel konnte nicht gespeichert werden.",
        groupMembers: "Mitglieder verwalten",
        groupInvites: "Einladungen verwalten",
      })[key] ?? key,
  }),
}));
jest.mock("@expo/ui", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    BottomSheet: ({ isPresented, children }: { isPresented: boolean; children: React.ReactNode }) =>
      isPresented ? <View>{children}</View> : null,
    Column: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});
jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false, isJumuah: false }),
  };
});

describe("GroupManageScreen", () => {
  it("lets an owner save a weekly group goal", async () => {
    const view = await render(<GroupManageScreen />);
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Gruppenziel setzen" }));
    });
    await act(async () => {
      fireEvent.changeText(view.getByLabelText("Zielwert"), "12000");
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Ziel speichern" }));
    });
    expect(mockSetGroupGoal).toHaveBeenCalledWith("group-1", "week", 12000, 4);
  });

  it("shows a save failure instead of blaming a valid goal amount", async () => {
    mockSetGroupGoal.mockRejectedValueOnce(new Error("OFFLINE"));
    const view = await render(<GroupManageScreen />);
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Gruppenziel setzen" }));
    });
    await act(async () => {
      fireEvent.changeText(view.getByLabelText("Zielwert"), "12000");
    });
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Ziel speichern" }));
    });

    expect(
      view.getByText("Das Gruppenziel konnte nicht gespeichert werden."),
    ).toBeTruthy();
  });
});
