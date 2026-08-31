import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { GroupCreateScreen } from "@/screens/groups";

const mockReplace = jest.fn();
const mockCreateGroup = jest.fn<
  (
    name: string,
    timezone: string,
    anonymous: boolean,
    rulesAccepted: boolean,
  ) => Promise<{ group: { id: string } }>
>();
const mockUseGroups = jest.fn();
const mockUseEntries = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock("@/lib/groups", () => ({
  useGroups: () => mockUseGroups(),
}));

jest.mock("@/lib/entries", () => ({
  useEntries: () => mockUseEntries(),
}));

jest.mock("@expo/ui", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );

  return {
    Host: ({ children }: { children: React.ReactNode }) => children,
    Switch: ({
      value,
      onValueChange,
      label,
      disabled,
      testID,
    }: {
      value: boolean;
      onValueChange(value: boolean): void;
      label?: string;
      disabled?: boolean;
      testID?: string;
    }) => (
      <Pressable
        testID={testID}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={() => onValueChange(!value)}
      >
        {label ? <Text>{label}</Text> : null}
      </Pressable>
    ),
  };
});

const copy: Record<string, string> = {
  groupsCreate: "Gruppe erstellen",
  groupNameLabel: "Gruppenname",
  groupNameHint: "2 bis 50 sichtbare Zeichen.",
  groupNameInvalid: "Der Gruppenname muss 2 bis 50 Zeichen lang sein.",
  groupTimezoneLabel: "Zeitzone",
  groupTimezoneHint: "IANA-Zeitzone, zum Beispiel Europe/Berlin.",
  groupTimezoneInvalid: "Bitte gib eine gültige IANA-Zeitzone ein.",
  groupCreateAnonymousLabel: "Rangliste anonym anzeigen",
  groupCreateAnonymousHint:
    "Andere Mitglieder sehen dann stabile Aliasnamen statt Anzeigenamen.",
  groupCreateAnonymousCaveat:
    "Hinweis: Wenn jemand die Rangliste vorher mit Anzeigenamen gesehen hat, wirkt die Anonymisierung nicht rückwirkend.",
  groupCreateRulesLabel:
    "Ich bestätige die Gruppenregeln und die freiwillige Teilnahme.",
  groupCreateRulesHint: "Ohne Zustimmung kann die Gruppe nicht erstellt werden.",
  groupCreateErrorOffline:
    "Du bist offline. Verbinde dich und versuche es erneut.",
  groupCreateErrorNameRejected:
    "Dieser Gruppenname ist nicht zulässig. Bitte wähle einen anderen Namen.",
  groupCreateErrorConsentRequired:
    "Bitte bestätige die Gruppenregeln, um fortzufahren.",
  groupCreateErrorRateLimited:
    "Zu viele Versuche. Bitte warte kurz und versuche es erneut.",
  groupCreateErrorGeneral:
    "Die Gruppe konnte nicht erstellt werden. Bitte versuche es erneut.",
};

jest.mock("@/localization", () => ({
  useTranslation: () => ({
    localeTag: "de-DE",
    t: (key: string) => copy[key] ?? key,
  }),
}));

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

function createGroupsState(overrides: Record<string, unknown> = {}) {
  return {
    revision: 0,
    online: true,
    groups: {
      status: "ready",
      items: [],
      errorCode: null,
    },
    mutation: {
      pending: false,
      kind: null as string | null,
      errorCode: null,
    },
    refreshGroups: jest.fn(),
    createGroup: mockCreateGroup,
    loadLeaderboard: jest.fn(),
    setAnonymity: jest.fn(),
    loadInvites: jest.fn(),
    createInvite: jest.fn(),
    revokeInvite: jest.fn(),
    previewInvite: jest.fn(),
    acceptInvite: jest.fn(),
    ...overrides,
  };
}

function submitButton(view: Awaited<ReturnType<typeof render>>) {
  return view.getAllByRole("button")[0];
}

async function changeText(
  view: Awaited<ReturnType<typeof render>>,
  testId: string,
  value: string,
) {
  await act(async () => {
    fireEvent.changeText(view.getByTestId(testId), value);
  });
}

async function press(
  view: Awaited<ReturnType<typeof render>>,
  target: "rules" | "anonymous" | "submit",
) {
  await act(async () => {
    if (target === "rules") {
      fireEvent.press(view.getByTestId("group-create-rules-switch"));
      return;
    }
    if (target === "anonymous") {
      fireEvent.press(view.getByTestId("group-create-anonymous-switch"));
      return;
    }
    fireEvent.press(submitButton(view));
  });
}

async function fillValidCreateForm(view: Awaited<ReturnType<typeof render>>) {
  await changeText(view, "group-create-name-input", "  Alpha   Circle  ");
  await changeText(view, "group-create-timezone-input", "Europe/Berlin");
  await press(view, "rules");

  await waitFor(() =>
    expect(submitButton(view).props.accessibilityState.disabled).toBe(false),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateGroup.mockResolvedValue({ group: { id: "group-123" } });
  mockUseEntries.mockReturnValue({ timeZone: "Europe/Berlin" });
  mockUseGroups.mockReturnValue(createGroupsState());
});

describe("MVP08 group create screen", () => {
  it("prefills timezone, validates input, and requires explicit rules acceptance", async () => {
    const view = await render(<GroupCreateScreen />);

    expect(view.getByTestId("group-create-timezone-input").props.value).toBe(
      "Europe/Berlin",
    );

    await changeText(view, "group-create-name-input", "Alpha");
    await changeText(view, "group-create-timezone-input", "Europe/Berlin");

    await waitFor(() =>
      expect(submitButton(view).props.accessibilityState.disabled).toBe(true),
    );

    await changeText(view, "group-create-name-input", " A ");
    await waitFor(() =>
      expect(
        view.getByText("Der Gruppenname muss 2 bis 50 Zeichen lang sein."),
      ).toBeTruthy(),
    );

    await changeText(view, "group-create-timezone-input", "Invalid/Zone");
    await waitFor(() =>
      expect(
        view.getByText("Bitte gib eine gültige IANA-Zeitzone ein."),
      ).toBeTruthy(),
    );

    expect(mockCreateGroup).not.toHaveBeenCalled();
  });

  it("normalizes input, toggles anonymity, submits once, and navigates on success", async () => {
    const view = await render(<GroupCreateScreen />);

    await fillValidCreateForm(view);
    await press(view, "anonymous");
    await press(view, "submit");

    await waitFor(() =>
      expect(mockCreateGroup).toHaveBeenCalledWith(
        "Alpha Circle",
        "Europe/Berlin",
        true,
        true,
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/groups/[id]",
      params: { id: "group-123" },
    });
  });

  it.each([
    ["OFFLINE", "Du bist offline. Verbinde dich und versuche es erneut."],
    [
      "NAME_REJECTED",
      "Dieser Gruppenname ist nicht zulässig. Bitte wähle einen anderen Namen.",
    ],
    ["CONSENT_REQUIRED", "Bitte bestätige die Gruppenregeln, um fortzufahren."],
    [
      "RATE_LIMITED",
      "Zu viele Versuche. Bitte warte kurz und versuche es erneut.",
    ],
    [
      "INTERNAL",
      "Die Gruppe konnte nicht erstellt werden. Bitte versuche es erneut.",
    ],
  ])("maps create failure %s to clear feedback", async (code, message) => {
    mockCreateGroup.mockRejectedValueOnce(new Error(code));

    const view = await render(<GroupCreateScreen />);
    await fillValidCreateForm(view);
    await press(view, "submit");

    await waitFor(() => expect(view.getByText(message)).toBeTruthy());
  });

  it("disables submit while mutation is pending to prevent double submit", async () => {
    const groupsState = createGroupsState();
    mockUseGroups.mockImplementation(() => groupsState);

    const view = await render(<GroupCreateScreen />);
    await fillValidCreateForm(view);

    await press(view, "submit");
    expect(mockCreateGroup).toHaveBeenCalledTimes(1);

    groupsState.mutation = {
      pending: true,
      kind: "create_group",
      errorCode: null,
    };

    view.rerender(<GroupCreateScreen />);

    await waitFor(() =>
      expect(submitButton(view).props.accessibilityState.disabled).toBe(true),
    );
    await press(view, "submit");

    expect(mockCreateGroup).toHaveBeenCalledTimes(1);
  });
});
