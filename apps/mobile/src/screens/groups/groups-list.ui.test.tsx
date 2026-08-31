import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { GroupsScreen } from "@/screens/groups";

const mockPush = jest.fn();
const mockRefreshGroups = jest.fn<() => Promise<void>>();
const mockUseGroups = jest.fn();

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
};

jest.mock("@/localization", () => ({
  formatAppNumber: (value: number | bigint) => String(value),
  formatAppDate: (value: Date) => `date:${value.toISOString().slice(0, 10)}`,
  formatAppTime: (value: Date) => `time:${value.toISOString().slice(11, 16)}`,
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

    mockUseGroups.mockReturnValue(
      createGroupsState({
        online: false,
        groups: { status: "error", items: [], errorCode: "OFFLINE" },
      }),
    );
    const offline = await render(<GroupsScreen />);
    expect(offline.getByText("Offline")).toBeTruthy();
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

    fireEvent.press(view.getByRole("button", { name: "Alpha Circle" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/groups/[id]",
      params: { id: "group-1" },
    });
  });
});
