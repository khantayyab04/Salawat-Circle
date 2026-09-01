import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import GroupInvitesRoute from "@/app/(tabs)/groups/[id]/invites";
import { Alert, Share } from "react-native";

const mockLoadInvites = jest.fn<(groupId: string) => Promise<void>>();
type CreateInviteResponse = {
  invite: {
    id: string;
    groupId: string;
    token: string;
    code: string;
    expiresAt: string;
    maxUses: string;
    useCount: string;
    revokedAt: string | null;
    createdAt: string;
  };
};
type RevokeInviteResponse = {
  invite: {
    id: string;
    groupId: string;
    expiresAt: string;
    maxUses: string;
    useCount: string;
    revokedAt: string | null;
    createdAt: string;
    status: "active" | "expired" | "exhausted" | "revoked";
  };
};
const mockCreateInvite = jest.fn<
  (groupId: string, options: { expiresInDays: number; maxUses: number }) => Promise<CreateInviteResponse>
>();
const mockRevokeInvite = jest.fn<
  (groupId: string, inviteId: string) => Promise<RevokeInviteResponse>
>();
const mockUseGroups = jest.fn();
let mockGroupId = "group-1";
let previousJoinBaseUrl: string | undefined;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: mockGroupId }),
  Stack: { Screen: () => null },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const cleanup = effect();
    return cleanup;
  },
}));

jest.mock("@/lib/groups", () => {
  const actual = jest.requireActual<typeof import("@/lib/groups")>("@/lib/groups");
  return {
    ...actual,
    useGroups: () => mockUseGroups(),
  };
});

const copy: Record<string, string> = {
  groupInvitesTitle: "Einladungen",
  groupInvitesCreateAction: "Neue Einladung erstellen",
  groupInvitesLoadingTitle: "Einladungen werden geladen",
  groupInvitesLoadingBody: "Wir holen den aktuellen Gruppenstand.",
  groupInvitesEmptyTitle: "Noch keine Einladung",
  groupInvitesEmptyBody: "Erstelle eine Einladung und teile sie mit deiner Gruppe.",
  groupInvitesRefresh: "Aktualisieren",
  groupInvitesOfflineTitle: "Offline",
  groupInvitesOfflineBody:
    "Verbinde dich mit dem Internet, um Einladungen zu verwalten.",
  groupInvitesRateLimitedTitle: "Bitte kurz warten",
  groupInvitesRateLimitedBody:
    "Zu viele Aktionen in kurzer Zeit. Versuche es gleich erneut.",
  groupInvitesErrorTitle: "Einladungen konnten nicht geladen werden",
  groupInvitesErrorBody: "Bitte versuche es erneut.",
  groupInvitesStatusActive: "Aktiv",
  groupInvitesStatusExpired: "Abgelaufen",
  groupInvitesStatusExhausted: "Verbraucht",
  groupInvitesStatusRevoked: "Widerrufen",
  groupInvitesUseLabel: "Nutzungen",
  groupInvitesExpiryLabel: "Ablauf",
  groupInvitesSecretTitle: "Neue Einladung",
  groupInvitesShareAction: "Teilen",
  groupInvitesCopyLinkAction: "Link kopieren",
  groupInvitesCopyCodeAction: "Code kopieren",
  groupInvitesDismissSecretAction: "Schließen",
  groupInvitesRevokeAction: "Widerrufen",
  groupInvitesRevokeConfirmTitle: "Einladung widerrufen?",
  groupInvitesRevokeConfirmBody:
    "Diese Einladung kann danach nicht mehr verwendet werden.",
  groupInvitesSecretLinkLabel: "Einladungslink",
  groupInvitesSecretCodeLabel: "Einladungscode",
  groupInvitesShareMessage:
    "Tritt unserer privaten Gruppe bei. Link: %{link} Code: %{code}",
  groupInvitesNotFoundTitle: "Einladung nicht gefunden",
  groupInvitesNotFoundBody:
    "Diese Einladung ist nicht mehr verfügbar. Aktualisiere die Liste.",
  groupInvitesActionErrorTitle: "Aktion fehlgeschlagen",
  groupInvitesActionErrorBody:
    "Die Aktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
  stateForbiddenTitle: "Kein Zugriff",
  stateForbiddenBody: "Du darfst diesen Inhalt nicht öffnen.",
};

jest.mock("@/localization", () => ({
  formatAppDate: (value: Date) => `date:${value.toISOString().slice(0, 10)}`,
  formatAppTime: (value: Date) => `time:${value.toISOString().slice(11, 16)}`,
  formatAppNumber: (value: number | bigint) => String(value),
  useTranslation: () => ({
    localeTag: "de-DE",
    t: (key: string, values?: Record<string, string>) => {
      const template = copy[key] ?? key;
      if (!values) return template;
      return template.replace(/%\{(.*?)\}/gu, (_, valueKey: string) => {
        return values[valueKey] ?? "";
      });
    },
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
    online: true,
    groups: {
      status: "ready",
      errorCode: null,
      items: [
        {
          id: "group-1",
          name: "Alpha Circle",
          timezone: "Europe/Berlin",
          role: "owner",
          memberCount: "3",
          ownWeekTotal: "0",
          ownRank: 1,
          leaderboardAnonymous: false,
          revision: 2,
          updatedAt: "2026-08-31T22:00:00.000Z",
          calculatedAt: "2026-08-31T22:01:00.000Z",
        },
      ],
    },
    invites: {
      groupId: "group-1",
      status: "ready",
      errorCode: null,
      items: [],
    },
    mutation: {
      pending: false,
      kind: null,
      errorCode: null,
    },
    loadInvites: mockLoadInvites,
    createInvite: mockCreateInvite,
    revokeInvite: mockRevokeInvite,
    refreshGroups: jest.fn(),
    createGroup: jest.fn(),
    loadLeaderboard: jest.fn(),
    setAnonymity: jest.fn(),
    previewInvite: jest.fn(),
    acceptInvite: jest.fn(),
    ...overrides,
  };
}

describe("Task 15 owner invite screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    previousJoinBaseUrl = process.env.EXPO_PUBLIC_JOIN_BASE_URL;
    process.env.EXPO_PUBLIC_JOIN_BASE_URL = "https://join.example.com";
    mockGroupId = "group-1";
    mockLoadInvites.mockResolvedValue(undefined);
    mockCreateInvite.mockResolvedValue({
      invite: {
        id: "invite-2",
        groupId: "group-1",
        token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        code: "ABCD2345EF",
        expiresAt: "2026-09-07T12:00:00.000Z",
        maxUses: "25",
        useCount: "0",
        revokedAt: null,
        createdAt: "2026-08-31T12:00:00.000Z",
      },
    });
    mockRevokeInvite.mockResolvedValue({
      invite: {
        id: "invite-2",
        groupId: "group-1",
        expiresAt: "2026-09-07T12:00:00.000Z",
        maxUses: "25",
        useCount: "0",
        revokedAt: "2026-08-31T13:00:00.000Z",
        createdAt: "2026-08-31T12:00:00.000Z",
        status: "revoked",
      },
    });
    mockUseGroups.mockReturnValue(createGroupsState());
    jest.spyOn(Share, "share").mockResolvedValue({
      action: Share.sharedAction,
    } as never);
    jest.spyOn(Clipboard, "setStringAsync").mockResolvedValue(true);
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (typeof previousJoinBaseUrl === "string") {
      process.env.EXPO_PUBLIC_JOIN_BASE_URL = previousJoinBaseUrl;
      return;
    }

    delete process.env.EXPO_PUBLIC_JOIN_BASE_URL;
  });

  it("loads invites, creates default 7-day/25-use secrets, and supports share + copy", async () => {
    const view = await render(<GroupInvitesRoute />);

    await waitFor(() => expect(mockLoadInvites).toHaveBeenCalledWith("group-1"));
    await waitFor(() =>
      expect(view.getByRole("button", { name: "Neue Einladung erstellen" })).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Neue Einladung erstellen" }));
    });

    await waitFor(() =>
      expect(mockCreateInvite).toHaveBeenCalledWith("group-1", {
        expiresInDays: 7,
        maxUses: 25,
      }),
    );

    const expectedLink =
      "https://join.example.com/join/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    expect(view.getByText("ABCD2345EF")).toBeTruthy();
    expect(view.getByText(expectedLink)).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Teilen" }));
    });
    await waitFor(() => expect(Share.share).toHaveBeenCalledTimes(1));
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(expectedLink),
      }),
    );
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("ABCD2345EF"),
      }),
    );

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Link kopieren" }));
    });
    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(expectedLink),
    );
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Code kopieren" }));
    });
    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("ABCD2345EF"),
    );
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledTimes(2));
  });

  it("confirms revocation and clears the secret card after a successful revoke", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((_, __, buttons) => {
      const revokeButton = buttons?.find((button) => button?.style === "destructive");
      revokeButton?.onPress?.();
    });
    const view = await render(<GroupInvitesRoute />);

    await waitFor(() =>
      expect(view.getByRole("button", { name: "Neue Einladung erstellen" })).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Neue Einladung erstellen" }));
    });
    await waitFor(() => expect(view.getByText("ABCD2345EF")).toBeTruthy());

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Widerrufen" }));
    });
    await waitFor(() => expect(mockRevokeInvite).toHaveBeenCalledWith("group-1", "invite-2"));
    await waitFor(() => expect(mockLoadInvites).toHaveBeenCalledTimes(2));
    expect(view.queryByText("ABCD2345EF")).toBeNull();
  });

  it("renders invite rows with localized status labels, expiry, and usage counters", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        invites: {
          groupId: "group-1",
          status: "ready",
          errorCode: null,
          items: [
            {
              id: "invite-active",
              groupId: "group-1",
              expiresAt: "2026-09-07T12:00:00.000Z",
              maxUses: "25",
              useCount: "4",
              revokedAt: null,
              createdAt: "2026-08-31T12:00:00.000Z",
              status: "active",
            },
            {
              id: "invite-expired",
              groupId: "group-1",
              expiresAt: "2026-09-08T13:00:00.000Z",
              maxUses: "25",
              useCount: "25",
              revokedAt: null,
              createdAt: "2026-08-31T12:00:00.000Z",
              status: "expired",
            },
            {
              id: "invite-revoked",
              groupId: "group-1",
              expiresAt: "2026-09-09T14:00:00.000Z",
              maxUses: "10",
              useCount: "1",
              revokedAt: "2026-09-01T08:00:00.000Z",
              createdAt: "2026-08-31T12:00:00.000Z",
              status: "revoked",
            },
            {
              id: "invite-exhausted",
              groupId: "group-1",
              expiresAt: "2026-09-10T15:00:00.000Z",
              maxUses: "3",
              useCount: "3",
              revokedAt: null,
              createdAt: "2026-08-31T12:00:00.000Z",
              status: "exhausted",
            },
          ],
        },
      }),
    );

    const view = await render(<GroupInvitesRoute />);

    expect(view.getByText("Aktiv")).toBeTruthy();
    expect(view.getByText("Abgelaufen")).toBeTruthy();
    expect(view.getAllByText("Widerrufen").length).toBeGreaterThan(0);
    expect(view.getByText("Verbraucht")).toBeTruthy();
    expect(view.getByText("Nutzungen: 4 / 25")).toBeTruthy();
    expect(view.getByText("Nutzungen: 25 / 25")).toBeTruthy();
    expect(view.getByText("Nutzungen: 1 / 10")).toBeTruthy();
    expect(view.getByText("Nutzungen: 3 / 3")).toBeTruthy();
    expect(view.getByText("Ablauf: date:2026-09-07 time:12:00")).toBeTruthy();
    expect(view.getByText("Ablauf: date:2026-09-08 time:13:00")).toBeTruthy();
    expect(view.getByText("Ablauf: date:2026-09-09 time:14:00")).toBeTruthy();
    expect(view.getByText("Ablauf: date:2026-09-10 time:15:00")).toBeTruthy();

    const revokeButtons = view.getAllByRole("button", { name: "Widerrufen" });
    expect(revokeButtons[0]?.props.accessibilityState.disabled).toBe(false);
    expect(revokeButtons[1]?.props.accessibilityState.disabled).toBe(true);
    expect(revokeButtons[2]?.props.accessibilityState.disabled).toBe(true);
    expect(revokeButtons[3]?.props.accessibilityState.disabled).toBe(true);
  });

  it("keeps revoke pending state on the targeted invite row only", async () => {
    let resolveRevoke: ((value: RevokeInviteResponse) => void) | null = null;
    mockRevokeInvite.mockImplementation(
      async () =>
        new Promise<RevokeInviteResponse>((resolve) => {
          resolveRevoke = resolve;
        }),
    );
    jest.spyOn(Alert, "alert").mockImplementation((_, __, buttons) => {
      const revokeButton = buttons?.find((button) => button?.style === "destructive");
      revokeButton?.onPress?.();
    });
    mockUseGroups.mockReturnValue(
      createGroupsState({
        invites: {
          groupId: "group-1",
          status: "ready",
          errorCode: null,
          items: [
            {
              id: "invite-a",
              groupId: "group-1",
              expiresAt: "2026-09-07T12:00:00.000Z",
              maxUses: "25",
              useCount: "0",
              revokedAt: null,
              createdAt: "2026-08-31T12:00:00.000Z",
              status: "active",
            },
            {
              id: "invite-b",
              groupId: "group-1",
              expiresAt: "2026-09-08T12:00:00.000Z",
              maxUses: "25",
              useCount: "0",
              revokedAt: null,
              createdAt: "2026-08-31T12:00:00.000Z",
              status: "active",
            },
          ],
        },
      }),
    );

    const view = await render(<GroupInvitesRoute />);
    const revokeButtons = view.getAllByRole("button", { name: "Widerrufen" });

    await act(async () => {
      fireEvent.press(revokeButtons[0]!);
    });

    try {
      await waitFor(() => expect(mockRevokeInvite).toHaveBeenCalledWith("group-1", "invite-a"));
      await waitFor(() => {
        expect(view.getAllByRole("button", { name: "Widerrufen" })).toHaveLength(1);
      });
    } finally {
      await act(async () => {
        resolveRevoke?.({
          invite: {
            id: "invite-a",
            groupId: "group-1",
            expiresAt: "2026-09-07T12:00:00.000Z",
            maxUses: "25",
            useCount: "0",
            revokedAt: "2026-09-01T00:00:00.000Z",
            createdAt: "2026-08-31T12:00:00.000Z",
            status: "revoked",
          },
        });
      });
      await waitFor(() => expect(mockLoadInvites).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(view.getAllByRole("button", { name: "Widerrufen" })).toHaveLength(2),
      );
    }
  });

  it.each([
    {
      code: "OFFLINE",
      expectedTitle: "Offline",
      expectedBody: "Verbinde dich mit dem Internet, um Einladungen zu verwalten.",
    },
    {
      code: "RATE_LIMITED",
      expectedTitle: "Bitte kurz warten",
      expectedBody: "Zu viele Aktionen in kurzer Zeit. Versuche es gleich erneut.",
    },
    {
      code: "NOT_FOUND",
      expectedTitle: "Einladung nicht gefunden",
      expectedBody:
        "Diese Einladung ist nicht mehr verfügbar. Aktualisiere die Liste.",
    },
  ] as const)(
    "maps create invite failure %s to localized actionable feedback",
    async ({ code, expectedTitle, expectedBody }) => {
      mockCreateInvite.mockRejectedValueOnce(new Error(code));

      const view = await render(<GroupInvitesRoute />);

      await waitFor(() =>
        expect(
          view.getByRole("button", { name: "Neue Einladung erstellen" }),
        ).toBeTruthy(),
      );
      await act(async () => {
        fireEvent.press(view.getByRole("button", { name: "Neue Einladung erstellen" }));
      });

      await waitFor(() => expect(view.getByText(expectedTitle)).toBeTruthy());
      expect(view.getByText(expectedBody)).toBeTruthy();
      expect(view.getByRole("button", { name: "Aktualisieren" })).toBeTruthy();
    },
  );

  it("renders forbidden action feedback for revoke failures", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        invites: {
          groupId: "group-1",
          status: "ready",
          errorCode: null,
          items: [
            {
              id: "invite-locked",
              groupId: "group-1",
              expiresAt: "2026-09-07T12:00:00.000Z",
              maxUses: "25",
              useCount: "0",
              revokedAt: null,
              createdAt: "2026-08-31T12:00:00.000Z",
              status: "active",
            },
          ],
        },
      }),
    );
    mockRevokeInvite.mockRejectedValueOnce(new Error("FORBIDDEN"));
    jest.spyOn(Alert, "alert").mockImplementation((_, __, buttons) => {
      const revokeButton = buttons?.find((button) => button?.style === "destructive");
      revokeButton?.onPress?.();
    });

    const view = await render(<GroupInvitesRoute />);

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Widerrufen" }));
    });

    await waitFor(() => expect(view.getByText("Kein Zugriff")).toBeTruthy());
    expect(view.getByText("Du darfst diesen Inhalt nicht öffnen.")).toBeTruthy();
  });

  it("shows a generic actionable error when invite link creation fails", async () => {
    mockCreateInvite.mockResolvedValueOnce({
      invite: {
        id: "invite-2",
        groupId: "group-1",
        token: "invalid-token",
        code: "ABCD2345EF",
        expiresAt: "2026-09-07T12:00:00.000Z",
        maxUses: "25",
        useCount: "0",
        revokedAt: null,
        createdAt: "2026-08-31T12:00:00.000Z",
      },
    });
    const view = await render(<GroupInvitesRoute />);

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Neue Einladung erstellen" }));
    });

    await waitFor(() =>
      expect(view.getByText("Aktion fehlgeschlagen")).toBeTruthy(),
    );
    expect(
      view.getByText(
        "Die Aktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
      ),
    ).toBeTruthy();
    expect(view.queryByText("invalid-token")).toBeNull();
  });

  it("does not render action error banner from stale unrelated mutation error on mount", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        mutation: {
          pending: false,
          kind: null,
          errorCode: "RATE_LIMITED",
        },
      }),
    );

    const view = await render(<GroupInvitesRoute />);

    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Neue Einladung erstellen" }),
      ).toBeTruthy(),
    );
    expect(view.queryByText("Bitte kurz warten")).toBeNull();
    expect(view.queryByText("Zu viele Aktionen in kurzer Zeit. Versuche es gleich erneut.")).toBeNull();
  });

  it("clears local create action error on retry and keeps it cleared despite stale mutation error", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        mutation: {
          pending: false,
          kind: null,
          errorCode: "RATE_LIMITED",
        },
      }),
    );
    mockCreateInvite.mockRejectedValueOnce(new Error("OFFLINE"));

    const view = await render(<GroupInvitesRoute />);

    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Neue Einladung erstellen" }),
      ).toBeTruthy(),
    );

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Neue Einladung erstellen" }));
    });

    await waitFor(() =>
      expect(view.getByText("Offline")).toBeTruthy(),
    );
    expect(
      view.getByText(
        "Verbinde dich mit dem Internet, um Einladungen zu verwalten.",
      ),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Aktualisieren" }));
    });

    await waitFor(() => expect(mockLoadInvites).toHaveBeenCalledTimes(2));
    expect(view.queryByText("Offline")).toBeNull();
    expect(
      view.queryByText(
        "Verbinde dich mit dem Internet, um Einladungen zu verwalten.",
      ),
    ).toBeNull();
  });

  it("renders dedicated offline state", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        online: false,
        invites: {
          groupId: "group-1",
          status: "error",
          errorCode: "OFFLINE",
          items: [],
        },
      }),
    );
    const offline = await render(<GroupInvitesRoute />);
    await waitFor(() => expect(offline.getByText("Offline")).toBeTruthy());
  });

  it("renders dedicated rate-limit loading state", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        online: true,
        invites: {
          groupId: "group-1",
          status: "error",
          errorCode: "RATE_LIMITED",
          items: [],
        },
      }),
    );
    const limited = await render(<GroupInvitesRoute />);
    await waitFor(() =>
      expect(limited.getByText("Bitte kurz warten")).toBeTruthy(),
    );
  });

  it("shows forbidden state when current member is not the group owner", async () => {
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
              role: "member",
              memberCount: "3",
              ownWeekTotal: "0",
              ownRank: 1,
              leaderboardAnonymous: false,
              revision: 2,
              updatedAt: "2026-08-31T22:00:00.000Z",
              calculatedAt: "2026-08-31T22:01:00.000Z",
            },
          ],
        },
      }),
    );
    const view = await render(<GroupInvitesRoute />);

    expect(view.getByText("Kein Zugriff")).toBeTruthy();
    expect(view.getByText("Du darfst diesen Inhalt nicht öffnen.")).toBeTruthy();
    expect(
      view.getByRole("button", { name: "Neue Einladung erstellen" }).props
        .accessibilityState.disabled,
    ).toBe(true);
  });
});
