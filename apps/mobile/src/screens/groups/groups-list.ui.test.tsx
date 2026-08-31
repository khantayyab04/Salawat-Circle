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
    await act(async () => {
      fireEvent.press(errorRetry);
      await Promise.resolve();
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
    await act(async () => {
      fireEvent.press(offlineRetry);
      await Promise.resolve();
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

  it("initializes from idle, provides pull-to-refresh, and opens create", async () => {
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

    fireEvent.press(view.getByRole("button", { name: "Gruppe erstellen" }));
    expect(mockPush).toHaveBeenCalledWith("/groups/create");
  });

  it("renders group rows with metrics and navigates to detail", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        groups: {
          status: "ready",
          errorCode: null,
          items: [
            {
              id: "group-1",
              name: "Alpha Circle",
              timezone: "Europe/Berlin",
              role: "owner",
              memberCount: "5",
              ownWeekTotal: "1234",
              ownRank: 2,
              leaderboardAnonymous: true,
              revision: 7,
              updatedAt: "2026-08-31T20:00:00.000Z",
              calculatedAt: "2026-08-31T20:05:00.000Z",
            },
          ],
        },
      }),
    );

    const view = await render(<GroupsScreen />);

    expect(view.getByText("Alpha Circle")).toBeTruthy();
    expect(view.getByText("Diese Woche: Rang 2 · 1234")).toBeTruthy();
    expect(view.getByText("5 aktive Mitglieder")).toBeTruthy();
    expect(
      view.getByText("Berechnet: date:2026-08-31 time:20:05"),
    ).toBeTruthy();
    expect(
      view.getByText("Aktualisiert: date:2026-08-31 time:20:00"),
    ).toBeTruthy();
    expect(view.getByText("Anonyme Rangliste aktiv")).toBeTruthy();

    const groupButton = view.getByRole("button", { name: /Alpha Circle/ });
    expect(groupButton.props.accessibilityLabel).toContain("Rang 2");
    expect(groupButton.props.accessibilityLabel).toContain("1234");
    expect(groupButton.props.accessibilityLabel).toContain("5 aktive Mitglieder");
    expect(groupButton.props.accessibilityHint).toContain("Berechnet");
    expect(groupButton.props.accessibilityHint).toContain("Aktualisiert");
    expect(groupButton.props.accessibilityHint).toContain(
      "Anonyme Rangliste aktiv",
    );

    fireEvent.press(groupButton);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/groups/[id]",
      params: { id: "group-1" },
    });
  });

  it("shows a partial error banner with retry while keeping cached rows", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        online: true,
        groups: {
          status: "ready",
          errorCode: "INTERNAL",
          items: [
            {
              id: "group-2",
              name: "Beta Circle",
              timezone: "Europe/Berlin",
              role: "owner",
              memberCount: "3",
              ownWeekTotal: "456",
              ownRank: 1,
              leaderboardAnonymous: false,
              revision: 8,
              updatedAt: "2026-08-31T20:00:00.000Z",
              calculatedAt: "2026-08-31T20:05:00.000Z",
            },
          ],
        },
      }),
    );

    const view = await render(<GroupsScreen />);

    expect(view.getByText("Beta Circle")).toBeTruthy();
    expect(view.getByText("Nicht alles konnte geladen werden")).toBeTruthy();
    expect(view.getByText("Die vorhandenen Inhalte bleiben sichtbar.")).toBeTruthy();
    const refreshButton = view.getByRole("button", { name: "Aktualisieren" });
    await act(async () => {
      fireEvent.press(refreshButton);
      await Promise.resolve();
    });
    await waitFor(() => expect(mockRefreshGroups).toHaveBeenCalledTimes(1));
  });

  it("memoizes group rows to avoid recomputing metrics on unrelated rerenders", async () => {
    const sharedGroup = {
      id: "group-3",
      name: "Gamma Circle",
      timezone: "Europe/Berlin",
      role: "owner",
      memberCount: "9",
      ownWeekTotal: "999",
      ownRank: 4,
      leaderboardAnonymous: true,
      revision: 3,
      updatedAt: "2026-08-31T20:00:00.000Z",
      calculatedAt: "2026-08-31T20:05:00.000Z",
    } as const;

    const groupsState = createGroupsState({
      groups: {
        status: "ready",
        errorCode: null,
        items: [sharedGroup],
      },
    });
    mockUseGroups.mockImplementation(() => groupsState);

    const view = await render(<GroupsScreen />);
    expect(mockFormatAppNumber.mock.calls.length).toBeGreaterThan(0);
    expect(mockFormatAppDate.mock.calls.length).toBeGreaterThan(0);
    expect(mockFormatAppTime.mock.calls.length).toBeGreaterThan(0);

    mockFormatAppNumber.mockClear();
    mockFormatAppDate.mockClear();
    mockFormatAppTime.mockClear();

    view.rerender(<GroupsScreen />);

    expect(mockFormatAppNumber).not.toHaveBeenCalled();
    expect(mockFormatAppDate).not.toHaveBeenCalled();
    expect(mockFormatAppTime).not.toHaveBeenCalled();
  });
});
