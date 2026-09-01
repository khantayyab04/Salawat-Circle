import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { GroupsError } from "@/lib/groups/errors";
import GroupDetailRoute from "@/app/(tabs)/groups/[id]/index";

const mockPush = jest.fn();
const mockLoadLeaderboard = jest.fn<
  (
    groupId: string,
    period: "week" | "all_time",
    options?: { mode?: "reset" | "next" },
  ) => Promise<void>
>();
const mockSetAnonymity = jest.fn<
  (groupId: string, anonymous: boolean, revision?: number) => Promise<unknown>
>();
const mockRefreshGroups = jest.fn<() => Promise<void>>();
const mockUseGroups = jest.fn();
let mockRouteGroupId = "group-1";
let lastStackTitle: string | undefined;

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: mockRouteGroupId }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(callback, [callback]);
  },
  Stack: {
    Screen: ({
      options,
    }: {
      options?: {
        title?: string;
      };
    }) => {
      lastStackTitle = options?.title;
      return null;
    },
  },
}));

jest.mock("@/lib/groups", () => ({
  useGroups: () => mockUseGroups(),
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
  groupTitle: "Private Gruppe",
  groupDetailTitle: "Gruppendetail",
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
  groupMembers: "Mitglieder verwalten",
  groupDetailRenameAction: "Gruppe umbenennen",
  groupDetailRenameLabel: "Neuer Gruppenname",
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

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  if (!resolve || !reject) {
    throw new Error("Deferred promise setup failed.");
  }
  return { promise, resolve, reject };
}

function createPeriodState(
  period: "week" | "all_time",
  overrides: Record<string, unknown> = {},
) {
  return {
    period,
    loading: false,
    loadingMore: false,
    errorCode: null,
    items: [],
    nextCursor: null,
    hasMore: false,
    calculatedAt: "2026-08-31T20:05:00.000Z",
    group: {
      id: "group-1",
      name: "Alpha Circle",
      timezone: "Europe/Berlin",
      leaderboardAnonymous: false,
      memberCount: "5",
      role: "owner",
      isOwner: true,
      revision: 7,
    },
    ownAlias: "Ruhiger Garten",
    ownRank: 1,
    periodStart: "2026-08-25",
    periodEnd: "2026-08-31",
    ...overrides,
  };
}

function createGroupsState(overrides: Record<string, unknown> = {}) {
  const week = createPeriodState("week");
  const allTime = createPeriodState("all_time", { ownRank: 2 });

  return {
    revision: 0,
    online: true,
    groups: {
      status: "ready",
      items: [
        {
          id: "group-1",
          name: "Alpha Circle",
          timezone: "Europe/Berlin",
          role: "owner",
          memberCount: "5",
          ownWeekTotal: "1234",
          ownRank: 2,
          leaderboardAnonymous: false,
          revision: 7,
          updatedAt: "2026-08-31T20:00:00.000Z",
          calculatedAt: "2026-08-31T20:05:00.000Z",
        },
      ],
      errorCode: null,
    },
    leaderboard: {
      selectedGroupId: "group-1",
      selectedPeriod: "week",
      byGroup: {
        "group-1": {
          week,
          all_time: allTime,
        },
      },
    },
    mutation: {
      pending: false,
      kind: null,
      errorCode: null,
    },
    refreshGroups: mockRefreshGroups,
    createGroup: jest.fn(),
    loadLeaderboard: mockLoadLeaderboard,
    setAnonymity: mockSetAnonymity,
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
  mockRouteGroupId = "group-1";
  lastStackTitle = undefined;
  mockLoadLeaderboard.mockResolvedValue(undefined);
  mockSetAnonymity.mockResolvedValue({});
  mockRefreshGroups.mockResolvedValue(undefined);
  mockUseGroups.mockReturnValue(createGroupsState());
});

const errorCases: ["OFFLINE" | "RATE_LIMITED" | "NOT_FOUND" | "INTERNAL", string][] = [
  ["OFFLINE", "Du bist offline. Verbinde dich und aktualisiere die Rangliste."],
  ["RATE_LIMITED", "Zu viele Anfragen. Versuche es in einem Moment erneut."],
  ["NOT_FOUND", "Diese Gruppe ist nicht mehr verfügbar oder du hast keinen Zugriff."],
  ["INTERNAL", "Bitte versuche es erneut."],
];

describe("Task 14 group detail screen", () => {
  it("links the group detail to member management for an owner", async () => {
    const view = await render(<GroupDetailRoute />);

    await waitFor(() =>
      expect(view.getByRole("button", { name: "Mitglieder verwalten" })).toBeTruthy(),
    );
    fireEvent.press(view.getByRole("button", { name: "Mitglieder verwalten" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/groups/[id]/members",
      params: { id: "group-1" },
    });
  });

  it("opens the owner rename form from the detail screen", async () => {
    const view = await render(<GroupDetailRoute />);

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Gruppe umbenennen" }));
    });
    await waitFor(() => expect(view.getByDisplayValue("Alpha Circle")).toBeTruthy());
  });

  it("triggers a fresh week reset load on mount even when week data is already cached", async () => {
    const view = await render(<GroupDetailRoute />);

    await waitFor(() =>
      expect(mockLoadLeaderboard).toHaveBeenCalledWith("group-1", "week", {
        mode: "reset",
      }),
    );
    expect(mockLoadLeaderboard).toHaveBeenCalledTimes(1);

    expect(view.queryByText("Private Gruppe")).toBeNull();
    expect(view.getByText("Alpha Circle")).toBeTruthy();
    expect(view.getByText("5 aktive Mitglieder")).toBeTruthy();
    expect(
      view.getByText("Zuletzt berechnet: date:2026-08-31 time:20:05"),
    ).toBeTruthy();
  });

  it("uses a neutral stack title while details are still loading", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        groups: {
          status: "ready",
          items: [],
          errorCode: null,
        },
        leaderboard: {
          selectedGroupId: "group-1",
          selectedPeriod: "week",
          byGroup: {
            "group-1": {
              week: createPeriodState("week", {
                loading: true,
                group: null,
                ownAlias: null,
                ownRank: null,
                calculatedAt: null,
                periodStart: null,
                periodEnd: null,
              }),
              all_time: createPeriodState("all_time", {
                group: null,
                ownAlias: null,
                ownRank: null,
                calculatedAt: null,
                periodStart: null,
                periodEnd: null,
              }),
            },
          },
        },
      }),
    );

    const view = await render(<GroupDetailRoute />);
    expect(lastStackTitle).toBe("Gruppendetail");
    expect(view.getByText("Rangliste wird geladen")).toBeTruthy();
  });

  it("uses not-found copy in the stack title only for an actual NOT_FOUND state", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        groups: {
          status: "ready",
          items: [],
          errorCode: null,
        },
        leaderboard: {
          selectedGroupId: "group-1",
          selectedPeriod: "week",
          byGroup: {
            "group-1": {
              week: createPeriodState("week", {
                items: [],
                errorCode: "NOT_FOUND",
                group: null,
                ownAlias: null,
                ownRank: null,
                calculatedAt: null,
                periodStart: null,
                periodEnd: null,
              }),
              all_time: createPeriodState("all_time"),
            },
          },
        },
      }),
    );

    const view = await render(<GroupDetailRoute />);
    expect(lastStackTitle).toBe("Gruppe nicht gefunden");
    expect(
      view.getByText("Diese Gruppe ist nicht mehr verfügbar oder du hast keinen Zugriff."),
    ).toBeTruthy();
  });

  it("supports accessible week/all-time switching and resets each period", async () => {
    const view = await render(<GroupDetailRoute />);

    const weekButton = view.getByRole("button", { name: "Woche" });
    const allTimeButton = view.getByRole("button", { name: "Gesamt" });

    expect(weekButton.props.accessibilityState.selected).toBe(true);
    expect(allTimeButton.props.accessibilityState.selected).toBe(false);
    expect(weekButton).toHaveStyle({ minHeight: 44 });
    expect(allTimeButton).toHaveStyle({ minHeight: 44 });

    fireEvent.press(allTimeButton);
    await waitFor(() =>
      expect(mockLoadLeaderboard).toHaveBeenCalledWith("group-1", "all_time", {
        mode: "reset",
      }),
    );
    expect(allTimeButton.props.accessibilityState.selected).toBe(true);

    fireEvent.press(weekButton);
    await waitFor(() =>
      expect(mockLoadLeaderboard).toHaveBeenCalledWith("group-1", "week", {
        mode: "reset",
      }),
    );
    expect(weekButton.props.accessibilityState.selected).toBe(true);
  });

  it("renders rank rows with self marker and excludes private identifiers", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        leaderboard: {
          selectedGroupId: "group-1",
          selectedPeriod: "week",
          byGroup: {
            "group-1": {
              week: createPeriodState("week", {
                items: [
                  {
                    rowId: "membership-row-111",
                    rank: 1,
                    displayName: "Amina",
                    total: "900",
                    isSelf: true,
                  },
                  {
                    rowId: "membership-row-222",
                    rank: 2,
                    displayName: "Hassan",
                    total: "450",
                    isSelf: false,
                  },
                ],
              }),
              all_time: createPeriodState("all_time"),
            },
          },
        },
      }),
    );

    const view = await render(<GroupDetailRoute />);

    expect(view.getByText("Amina")).toBeTruthy();
    expect(view.getByText("Hassan")).toBeTruthy();
    expect(view.getByText("Du")).toBeTruthy();
    expect(view.getByText("900")).toBeTruthy();

    const selfRow = view.getByTestId("group-detail-row-membership-row-111");
    expect(selfRow.props.accessibilityState.selected).toBe(true);

    expect(view.queryByText("membership-row-111")).toBeNull();
    expect(view.queryByText("person@example.com")).toBeNull();
    expect(view.queryByText("Europe/Berlin")).toBeNull();
    expect(view.queryByText("2026-08-31T20:00:00.000Z")).toBeNull();
  });

  it("shows owner anonymity controls, own alias, and invite navigation", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        leaderboard: {
          selectedGroupId: "group-1",
          selectedPeriod: "week",
          byGroup: {
            "group-1": {
              week: createPeriodState("week", {
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
              }),
              all_time: createPeriodState("all_time"),
            },
          },
        },
      }),
    );

    const view = await render(<GroupDetailRoute />);

    expect(view.getByRole("switch", { name: "Rangliste anonym anzeigen" })).toBeTruthy();
    expect(
      view.getByText(
        "Wenn aktiviert, siehst du deinen echten Anzeigenamen, andere sehen deinen stabilen Gruppenalias.",
      ),
    ).toBeTruthy();
    expect(view.getByText("Dein Alias in dieser Gruppe: Ruhiger Garten")).toBeTruthy();
    expect(
      view.getByText(
        "Hinweis: Bereits gesehene Anzeigenamen lassen sich nicht rückwirkend verbergen.",
      ),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByRole("switch", { name: "Rangliste anonym anzeigen" }));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(mockSetAnonymity).toHaveBeenCalledWith("group-1", false, 7),
    );

    fireEvent.press(view.getByRole("button", { name: "Einladungen verwalten" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/groups/[id]/invites",
      params: { id: "group-1" },
    });
  });

  it("shows read-only anonymity status for members without owner actions", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        leaderboard: {
          selectedGroupId: "group-1",
          selectedPeriod: "week",
          byGroup: {
            "group-1": {
              week: createPeriodState("week", {
                group: {
                  id: "group-1",
                  name: "Alpha Circle",
                  timezone: "Europe/Berlin",
                  leaderboardAnonymous: true,
                  memberCount: "5",
                  role: "member",
                  isOwner: false,
                  revision: 5,
                },
              }),
              all_time: createPeriodState("all_time"),
            },
          },
        },
      }),
    );

    const view = await render(<GroupDetailRoute />);

    expect(view.queryByRole("switch")).toBeNull();
    expect(view.getByText("Anonyme Rangliste ist aktiv.")).toBeTruthy();
    expect(view.getByText("Dein Alias in dieser Gruppe: Ruhiger Garten")).toBeTruthy();
    expect(
      view.getByText(
        "Hinweis: Bereits gesehene Anzeigenamen lassen sich nicht rückwirkend verbergen.",
      ),
    ).toBeTruthy();
    expect(view.queryByRole("button", { name: "Einladungen verwalten" })).toBeNull();
  });

  it("shows a visible error when owner anonymity toggle is attempted without a revision", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        groups: {
          status: "ready",
          items: [],
          errorCode: null,
        },
        leaderboard: {
          selectedGroupId: "group-1",
          selectedPeriod: "week",
          byGroup: {
            "group-1": {
              week: createPeriodState("week", {
                group: {
                  id: "group-1",
                  name: "Alpha Circle",
                  timezone: "Europe/Berlin",
                  leaderboardAnonymous: true,
                  memberCount: "5",
                  role: "owner",
                  isOwner: true,
                  revision: undefined,
                },
              }),
            },
          },
        },
      }),
    );

    const view = await render(<GroupDetailRoute />);

    await act(async () => {
      fireEvent.press(view.getByRole("switch", { name: "Rangliste anonym anzeigen" }));
      await Promise.resolve();
    });

    expect(
      view.getByText(
        "Die Einstellung konnte nicht gespeichert werden. Bitte aktualisiere die Gruppe und versuche es erneut.",
      ),
    ).toBeTruthy();
    expect(mockSetAnonymity).not.toHaveBeenCalled();
  });

  it("refreshes leaderboard and shows conflict text when anonymity toggle hits a revision conflict", async () => {
    mockSetAnonymity.mockRejectedValueOnce(new GroupsError("ENTRY_VERSION_CONFLICT"));

    const view = await render(<GroupDetailRoute />);

    await act(async () => {
      fireEvent.press(view.getByRole("switch", { name: "Rangliste anonym anzeigen" }));
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(mockLoadLeaderboard).toHaveBeenCalledWith("group-1", "week", {
        mode: "reset",
      }),
    );
    expect(
      view.getByText(
        "Zwischenzeitlich wurde eine neuere Änderung gespeichert. Wir laden den aktuellen Stand neu.",
      ),
    ).toBeTruthy();
  });

  it("shows actionable offline copy when owner anonymity toggle fails offline", async () => {
    mockSetAnonymity.mockRejectedValueOnce(new GroupsError("OFFLINE"));
    const view = await render(<GroupDetailRoute />);

    await act(async () => {
      fireEvent.press(view.getByRole("switch", { name: "Rangliste anonym anzeigen" }));
      await Promise.resolve();
    });

    expect(
      view.getByText("Du bist offline. Verbinde dich und aktualisiere die Rangliste."),
    ).toBeTruthy();
  });

  it.each(errorCases)(
    "maps %s to actionable localized copy",
    async (errorCode, expectedBody) => {
      mockUseGroups.mockReturnValue(
        createGroupsState({
          leaderboard: {
            selectedGroupId: "group-1",
            selectedPeriod: "week",
            byGroup: {
              "group-1": {
                week: createPeriodState("week", {
                  items: [],
                  errorCode,
                }),
                all_time: createPeriodState("all_time"),
              },
            },
          },
        }),
      );

      const view = await render(<GroupDetailRoute />);
      expect(view.getByText(expectedBody)).toBeTruthy();
      expect(view.getByRole("button", { name: "Aktualisieren" })).toBeTruthy();
    },
  );

  it("keeps rows visible and shows partial error while loading more fails", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        leaderboard: {
          selectedGroupId: "group-1",
          selectedPeriod: "week",
          byGroup: {
            "group-1": {
              week: createPeriodState("week", {
                items: [
                  {
                    rowId: "row-1",
                    rank: 1,
                    displayName: "Amina",
                    total: "900",
                    isSelf: true,
                  },
                ],
                hasMore: true,
                errorCode: "RATE_LIMITED",
              }),
              all_time: createPeriodState("all_time"),
            },
          },
        },
      }),
    );

    const view = await render(<GroupDetailRoute />);

    expect(view.getByText("Amina")).toBeTruthy();
    expect(view.getByText("Nicht alles konnte geladen werden")).toBeTruthy();
    expect(view.getByText("Die vorhandenen Inhalte bleiben sichtbar.")).toBeTruthy();
  });

  it("supports pull-to-refresh and de-duplicates rapid next-page calls", async () => {
    const nextDeferred = createDeferred<void>();
    mockLoadLeaderboard.mockImplementation((_groupId, _period, options) => {
      if (options?.mode === "next") {
        return nextDeferred.promise;
      }
      return Promise.resolve();
    });
    mockUseGroups.mockReturnValue(
      createGroupsState({
        leaderboard: {
          selectedGroupId: "group-1",
          selectedPeriod: "week",
          byGroup: {
            "group-1": {
              week: createPeriodState("week", {
                hasMore: true,
                items: [
                  {
                    rowId: "row-1",
                    rank: 1,
                    displayName: "Amina",
                    total: "900",
                    isSelf: true,
                  },
                ],
              }),
              all_time: createPeriodState("all_time"),
            },
          },
        },
      }),
    );

    const view = await render(<GroupDetailRoute />);
    const list = view.getByTestId("group-detail-list");

    expect(list.props.contentInsetAdjustmentBehavior).toBe("automatic");

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });
    expect(mockRefreshGroups).toHaveBeenCalledTimes(1);

    await act(async () => {
      list.props.onEndReached();
      list.props.onEndReached();
      await Promise.resolve();
    });

    expect(
      mockLoadLeaderboard.mock.calls.filter(([, , options]) => options?.mode === "next"),
    ).toHaveLength(1);

    nextDeferred.resolve(undefined);
    await act(async () => {
      await Promise.resolve();
    });
  });
});
