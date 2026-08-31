import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
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

  it("loads invites, creates default 7-day/25-use secrets, and supports share + copy", async () => {
    const view = await render(<GroupInvitesRoute />);

    await waitFor(() => expect(mockLoadInvites).toHaveBeenCalledWith("group-1"));
    await waitFor(() =>
      expect(view.getByRole("button", { name: "Neue Einladung erstellen" })).toBeTruthy(),
    );
    fireEvent.press(view.getByRole("button", { name: "Neue Einladung erstellen" }));

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

    fireEvent.press(view.getByRole("button", { name: "Teilen" }));
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

    fireEvent.press(view.getByRole("button", { name: "Link kopieren" }));
    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(expectedLink),
    );
    fireEvent.press(view.getByRole("button", { name: "Code kopieren" }));
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
    fireEvent.press(view.getByRole("button", { name: "Neue Einladung erstellen" }));
    await waitFor(() => expect(view.getByText("ABCD2345EF")).toBeTruthy());

    fireEvent.press(view.getByRole("button", { name: "Widerrufen" }));
    await waitFor(() => expect(mockRevokeInvite).toHaveBeenCalledWith("group-1", "invite-2"));
    await waitFor(() => expect(mockLoadInvites).toHaveBeenCalledTimes(2));
    expect(view.queryByText("ABCD2345EF")).toBeNull();
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
});
