import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type {
  GroupLeaderboardResponse,
  GroupListItem,
  GroupsGateway,
} from "@/lib/groups";
import { GroupsProvider } from "@/lib/groups";
import { GroupDetailScreen } from "./group-detail-screen";

const mockPush = jest.fn();
const routeGroupId = "group-1";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: routeGroupId }),
  Stack: { Screen: () => null },
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
  groupDetailWeek: "Woche",
  groupDetailAllTime: "Gesamt",
  groupDetailMembersLabel: "aktive Mitglieder",
  groupDetailCalculatedLabel: "Zuletzt berechnet",
  groupDetailCalculatedUnknown: "Noch nicht berechnet",
  groupDetailLoadMore: "Mehr laden",
  groupDetailEnd: "Alle Plätze geladen.",
  groupDetailEmptyTitle: "Noch keine Rangliste",
  groupDetailEmptyBody: "Sobald Werte vorhanden sind, erscheinen sie hier.",
  groupDetailLoadingTitle: "Rangliste wird geladen",
  groupDetailLoadingBody: "Wir holen den aktuellen Gruppenstand.",
  groupDetailOfflineTitle: "Offline",
  groupDetailOfflineBody:
    "Du bist offline. Verbinde dich und aktualisiere die Rangliste.",
  groupDetailRateLimitedTitle: "Bitte kurz warten",
  groupDetailRateLimitedBody:
    "Zu viele Anfragen. Versuche es in einem Moment erneut.",
  groupDetailNotFoundTitle: "Gruppe nicht gefunden",
  groupDetailNotFoundBody:
    "Diese Gruppe ist nicht mehr verfügbar oder du hast keinen Zugriff.",
  groupDetailConflictTitle: "Änderungskonflikt",
  groupDetailConflictBody:
    "Inzwischen gibt es einen neueren Stand. Bitte aktualisiere die Rangliste.",
  groupDetailErrorTitle: "Rangliste konnte nicht geladen werden",
  groupDetailErrorBody: "Bitte versuche es erneut.",
  groupDetailRefresh: "Aktualisieren",
  groupDetailSelfLabel: "Du",
  groupDetailAnonymityOwnerLabel: "Rangliste anonym anzeigen",
  groupDetailAnonymityOwnerHint:
    "Wenn aktiviert, siehst du deinen echten Anzeigenamen, andere sehen deinen stabilen Gruppenalias.",
  groupDetailAnonymityAliasPrefix: "Dein Alias in dieser Gruppe",
  groupDetailAnonymityCaveat:
    "Hinweis: Bereits gesehene Anzeigenamen lassen sich nicht rückwirkend verbergen.",
  groupDetailAnonymityMemberStatusOn: "Anonyme Rangliste ist aktiv.",
  groupDetailAnonymityMemberStatusOff: "Rangliste zeigt Anzeigenamen.",
  groupDetailAnonymityConflict:
    "Zwischenzeitlich wurde eine neuere Änderung gespeichert. Wir laden den aktuellen Stand neu.",
  groupDetailAnonymityRevisionMissing:
    "Die Einstellung konnte nicht gespeichert werden. Bitte aktualisiere die Gruppe und versuche es erneut.",
  groupDetailInviteAction: "Einladungen verwalten",
  statePartialErrorTitle: "Nicht alles konnte geladen werden",
  statePartialErrorBody: "Die vorhandenen Inhalte bleiben sichtbar.",
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

function createListItem(overrides: Partial<GroupListItem> = {}): GroupListItem {
  return {
    id: "group-1",
    name: "Alpha Circle",
    timezone: "Europe/Berlin",
    role: "owner",
    memberCount: "5",
    ownWeekTotal: "0",
    ownRank: 1,
    leaderboardAnonymous: true,
    revision: 7,
    updatedAt: "2026-08-31T20:00:00.000Z",
    calculatedAt: "2026-08-31T20:05:00.000Z",
    ...overrides,
  };
}

function createLeaderboardResponse(
  overrides: Partial<GroupLeaderboardResponse> = {},
): GroupLeaderboardResponse {
  return {
    group: {
      id: "group-1",
      name: "Alpha Circle",
      timezone: "Europe/Berlin",
      leaderboardAnonymous: true,
      memberCount: "5",
      role: "owner",
      isOwner: true,
      revision: 7,
    },
    period: "week",
    periodStart: "2026-08-25",
    periodEnd: "2026-08-31",
    ownRank: 1,
    ownAlias: "Ruhiger Garten",
    items: [
      {
        rowId: "row-1",
        rank: 1,
        displayName: "Amina",
        total: "900",
        isSelf: true,
      },
    ],
    nextCursor: null,
    hasMore: false,
    calculatedAt: "2026-08-31T20:05:00.000Z",
    ...overrides,
  };
}

function createGateway(overrides: Partial<GroupsGateway> = {}): GroupsGateway {
  return {
    listMyGroups: jest
      .fn<GroupsGateway["listMyGroups"]>()
      .mockResolvedValue({
        items: [createListItem()],
      }),
    createGroup: jest
      .fn<GroupsGateway["createGroup"]>()
      .mockRejectedValue(new Error("UNEXPECTED_CALL")),
    getLeaderboard: jest
      .fn<GroupsGateway["getLeaderboard"]>()
      .mockResolvedValue(createLeaderboardResponse()),
    setLeaderboardAnonymity: jest
      .fn<GroupsGateway["setLeaderboardAnonymity"]>()
      .mockRejectedValue(new Error("UNEXPECTED_CALL")),
    createInvite: jest
      .fn<GroupsGateway["createInvite"]>()
      .mockRejectedValue(new Error("UNEXPECTED_CALL")),
    listInvites: jest
      .fn<GroupsGateway["listInvites"]>()
      .mockRejectedValue(new Error("UNEXPECTED_CALL")),
    revokeInvite: jest
      .fn<GroupsGateway["revokeInvite"]>()
      .mockRejectedValue(new Error("UNEXPECTED_CALL")),
    previewInvite: jest
      .fn<GroupsGateway["previewInvite"]>()
      .mockRejectedValue(new Error("UNEXPECTED_CALL")),
    acceptInvite: jest
      .fn<GroupsGateway["acceptInvite"]>()
      .mockRejectedValue(new Error("UNEXPECTED_CALL")),
    ...overrides,
  };
}

describe("Group detail with real GroupsProvider", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("performs exactly one initial leaderboard load and settles without maximum-depth warnings", async () => {
    const getLeaderboard = jest
      .fn<GroupsGateway["getLeaderboard"]>()
      .mockResolvedValue(createLeaderboardResponse());
    const gateway = createGateway({ getLeaderboard });

    const view = await render(
      <GroupsProvider
        accountId="account-1"
        enabled
        gateway={gateway}
        onlineCheck={async () => true}
      >
        <GroupDetailScreen />
      </GroupsProvider>,
    );

    await waitFor(() => expect(view.getByText("Amina")).toBeTruthy());
    await act(async () => {
      await Promise.resolve();
    });

    expect(getLeaderboard).toHaveBeenCalledWith("group-1", "week", null, expect.any(Number));
    expect(getLeaderboard).toHaveBeenCalledTimes(1);
    const hasMaximumDepthWarning = consoleErrorSpy.mock.calls.some((args) =>
      args.some(
        (arg) =>
          typeof arg === "string" &&
          arg.includes("Maximum update depth exceeded"),
      ),
    );
    expect(hasMaximumDepthWarning).toBe(false);
  });

  it("refreshes state after anonymity conflict and updates owner controls to read-only", async () => {
    const getLeaderboard = jest
      .fn<GroupsGateway["getLeaderboard"]>()
      .mockResolvedValueOnce(createLeaderboardResponse())
      .mockResolvedValueOnce(
        createLeaderboardResponse({
          group: {
            id: "group-1",
            name: "Alpha Circle",
            timezone: "Europe/Berlin",
            leaderboardAnonymous: false,
            memberCount: "5",
            role: "member",
            isOwner: false,
            revision: 8,
          },
        }),
      );
    const setLeaderboardAnonymity = jest
      .fn<GroupsGateway["setLeaderboardAnonymity"]>()
      .mockRejectedValueOnce(new Error("ENTRY_VERSION_CONFLICT"));
    const gateway = createGateway({
      getLeaderboard,
      setLeaderboardAnonymity,
      listMyGroups: jest.fn<GroupsGateway["listMyGroups"]>().mockResolvedValue({
        items: [createListItem({ role: "owner", leaderboardAnonymous: true, revision: 7 })],
      }),
    });

    const view = await render(
      <GroupsProvider
        accountId="account-1"
        enabled
        gateway={gateway}
        onlineCheck={async () => true}
      >
        <GroupDetailScreen />
      </GroupsProvider>,
    );

    await waitFor(() =>
      expect(view.getByRole("switch", { name: "Rangliste anonym anzeigen" })).toBeTruthy(),
    );

    await act(async () => {
      fireEvent.press(view.getByRole("switch", { name: "Rangliste anonym anzeigen" }));
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(view.queryByRole("switch", { name: "Rangliste anonym anzeigen" })).toBeNull(),
    );
    expect(view.getByText("Rangliste zeigt Anzeigenamen.")).toBeTruthy();
    expect(getLeaderboard).toHaveBeenCalledTimes(2);
  });
});
