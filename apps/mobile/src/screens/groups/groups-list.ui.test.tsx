import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { GroupsScreen } from "@/screens/groups";

const mockPush = jest.fn();
const mockRefreshGroups = jest.fn<() => Promise<void>>();
const mockUseGroups = jest.fn();
const mockFormatAppNumber = jest.fn(
  (value: number | bigint, _localeTag?: string, _timeZone?: string) =>
    String(value),
);
const mockFormatAppDate = jest.fn(
  (value: Date, _localeTag?: string, _timeZone?: string) =>
    `date:${value.toISOString().slice(0, 10)}`,
);
const mockFormatAppTime = jest.fn(
  (value: Date, _localeTag?: string, _timeZone?: string) =>
    `time:${value.toISOString().slice(11, 16)}`,
);

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock("@/lib/groups", () => ({
  useGroups: () => mockUseGroups(),
}));

const copy: Record<string, string> = {
  groupsCreate: "Gruppe erstellen",
  groupsJoinManualCode: "Einladungscode eingeben",
  groupsEmptyTitle: "Noch keine Gruppe",
  groupsEmptyBody:
    "Du bist noch in keiner Gruppe. Erstelle eine private Gruppe oder tritt über einen Einladungslink bei.",
  groupsListLoadingTitle: "Gruppen werden geladen",
  groupsListLoadingBody: "Wir holen den aktuellen Serverstand.",
  groupsListErrorTitle: "Gruppen konnten nicht geladen werden",
  groupsListErrorBody: "Bitte versuche es erneut.",
  groupsListOfflineTitle: "Offline",
  groupsListOfflineBody:
    "Verbinde dich mit dem Internet, um Gruppen zu laden.",
  groupsListRefresh: "Aktualisieren",
  groupsListWeekTotalLabel: "Diese Woche",
  groupsListRankLabel: "Rang",
  groupsListRankUnranked: "ohne Rang",
  groupsListMembersLabel: "aktive Mitglieder",
  groupsListCalculatedLabel: "Berechnet",
  groupsListUpdatedLabel: "Aktualisiert",
  groupsListAnonymousOn: "Anonyme Rangliste aktiv",
  groupsListAnonymousOff: "Rangliste mit Anzeigenamen",
  statePartialErrorTitle: "Nicht alles konnte geladen werden",
  statePartialErrorBody: "Die vorhandenen Inhalte bleiben sichtbar.",
};

jest.mock("@/localization", () => ({
  formatAppNumber: (
    value: number | bigint,
    localeTag: string,
    timeZone?: string,
  ) => mockFormatAppNumber(value, localeTag, timeZone),
  formatAppDate: (
    value: Date,
    localeTag: string,
    timeZone?: string,
  ) => mockFormatAppDate(value, localeTag, timeZone),
  formatAppTime: (
    value: Date,
    localeTag: string,
    timeZone?: string,
  ) => mockFormatAppTime(value, localeTag, timeZone),
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
      kind: null,
      errorCode: null,
    },
    refreshGroups: mockRefreshGroups,
    createGroup: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks();
  mockRefreshGroups.mockResolvedValue(undefined);
  mockUseGroups.mockReturnValue(createGroupsState());
  mockFormatAppNumber.mockClear();
  mockFormatAppDate.mockClear();
  mockFormatAppTime.mockClear();
});

describe("MVP08 groups list screen", () => {
  it("shows the empty list state", async () => {
    const view = await render(<GroupsScreen />);
    expect(view.getByText("Noch keine Gruppe")).toBeTruthy();
  });

  it("shows loading, error, and offline states", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        groups: { status: "loading", items: [], errorCode: null },
      }),
    );
    const loading = await render(<GroupsScreen />);
    expect(loading.getByText("Gruppen werden geladen")).toBeTruthy();

    mockUseGroups.mockReturnValue(
      createGroupsState({
        online: true,
        groups: { status: "error", items: [], errorCode: "INTERNAL" },
      }),
    );
    const error = await render(<GroupsScreen />);
    expect(error.getByText("Gruppen konnten nicht geladen werden")).toBeTruthy();
    const errorAlert = error.getByRole("alert");
    const errorRetry = error.getByRole("button", { name: "Aktualisieren" });
    expect(errorAlert).toBeTruthy();
    expect(errorRetry).toBeTruthy();
    await act(async () => {
      fireEvent.press(errorRetry);
    });
    await waitFor(() => expect(mockRefreshGroups).toHaveBeenCalledTimes(1));

    mockUseGroups.mockReturnValue(
      createGroupsState({
        online: false,
        groups: { status: "error", items: [], errorCode: "OFFLINE" },
      }),
    );
    const offline = await render(<GroupsScreen />);
    expect(offline.getByText("Offline")).toBeTruthy();
    const offlineAlert = offline.getByRole("alert");
    const offlineRetry = offline.getByRole("button", { name: "Aktualisieren" });
    expect(offlineAlert).toBeTruthy();
    expect(offlineRetry).toBeTruthy();
    await act(async () => {
      fireEvent.press(offlineRetry);
    });
    await waitFor(() => expect(mockRefreshGroups).toHaveBeenCalledTimes(2));
  });

  it("keeps the empty state copy visible when offline with ready status", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        online: false,
        groups: { status: "ready", items: [], errorCode: "OFFLINE" },
      }),
    );
    const view = await render(<GroupsScreen />);
    expect(view.getByText("Noch keine Gruppe")).toBeTruthy();
    expect(
      view.getByText(
        "Du bist noch in keiner Gruppe. Erstelle eine private Gruppe oder tritt über einen Einladungslink bei.",
      ),
    ).toBeTruthy();
    expect(view.getByText("Offline")).toBeTruthy();
  });

  it("initializes from idle, provides pull-to-refresh, and opens create + manual join", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        groups: { status: "idle", items: [], errorCode: null },
      }),
    );

    const view = await render(<GroupsScreen />);

    await waitFor(() => expect(mockRefreshGroups).toHaveBeenCalledTimes(1));

    const scrollView = view.getByTestId("groups-list-screen");
    expect(typeof scrollView.props.refreshControl.props.onRefresh).toBe(
      "function",
    );

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Gruppe erstellen" }));
    });
    expect(mockPush).toHaveBeenCalledWith("/groups/create");

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Einladungscode eingeben" }));
    });
    expect(mockPush).toHaveBeenCalledWith("/join");
  });

});
