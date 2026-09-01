import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import JoinTokenRoute from "@/app/join/[token]";

type AcceptInviteResponse = {
  group: {
    id: string;
    name: string;
    timezone: string;
    leaderboardAnonymous: boolean;
    memberCount: string;
  };
  membership: {
    id: string;
    groupId: string;
    joinedAt: string;
    createdAt: string;
    sharingConsentVersion: string;
  };
  alreadyActive: boolean;
};
const mockPreviewInvite = jest.fn<
  (kind: "token" | "code", secret: string) => Promise<void>
>();
const mockAcceptInvite = jest.fn<
  (kind: "token" | "code", secret: string, locale: string) => Promise<AcceptInviteResponse>
>();
const mockUseGroups = jest.fn();
const mockRememberInvite = jest.fn<(token: string) => Promise<void>>();
const mockConsumePendingInvite = jest.fn<() => Promise<string | null>>();
const mockReplace = jest.fn();
const mockPush = jest.fn();

let mockAuthStatus:
  | "loading"
  | "signed_out"
  | "profile_required"
  | "consent_required"
  | "ready" = "ready";
let mockTokenParam: string | string[] | undefined =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

jest.mock("@/lib/groups", () => {
  const actual = jest.requireActual<typeof import("@/lib/groups")>("@/lib/groups");
  return {
    ...actual,
    useGroups: () => mockUseGroups(),
  };
});

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    status: mockAuthStatus,
    rememberInvite: mockRememberInvite,
    consumePendingInvite: mockConsumePendingInvite,
  }),
}));

const copy: Record<string, string> = {
  joinTitle: "Einladung prüfen",
  joinBody: "Prüfe die Gruppeninformationen, bevor du freiwillig beitrittst.",
  joinAction: "Einladung annehmen",
  joinManualCodeTitle: "Einladungscode eingeben",
  joinManualCodeLabel: "Einladungscode",
  joinManualCodeHint: "10 Zeichen, Buchstaben und Zahlen ohne 0, O, 1, I, L.",
  joinManualCodeSubmit: "Einladung prüfen",
  joinPreviewHeading: "Gruppenvorschau",
  joinMembersLabel: "aktive Mitglieder",
  joinAnonymityOn:
    "Aktuell sehen andere Mitglieder deinen Alias. Du siehst weiterhin deinen echten Namen.",
  joinAnonymityOff:
    "Aktuell sehen aktive Mitglieder deinen Anzeigenamen und aggregierte Salawat-Werte.",
  joinSharingExplanation:
    "Mit dem Beitritt werden dein Anzeigename und aggregierte Salawat-Werte für aktive Mitglieder sichtbar.",
  joinNoShareBeforeConfirm:
    "Vor deiner Bestätigung werden keine Werte geteilt.",
  joinAlreadyActiveHint:
    "Du bist bereits aktives Mitglied. Mit Bestätigen kommst du direkt zur Gruppe.",
  joinInvalidInviteMessage: "Diese Einladung ist nicht mehr gültig.",
  joinRateLimitedMessage:
    "Zu viele Versuche. Bitte warte kurz und versuche es erneut.",
  joinOfflineMessage:
    "Du bist offline. Verbinde dich mit dem Internet und versuche es erneut.",
};

jest.mock("@/localization", () => ({
  formatAppNumber: (value: number | bigint) => String(value),
  useTranslation: () => ({
    locale: "de",
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

jest.mock("expo-router", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Redirect: ({ href }: { href: string }) => <Text>{href}</Text>,
    useLocalSearchParams: () => ({ token: mockTokenParam }),
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
  };
});

jest.mock("expo-router/stack", () => ({
  Stack: { Screen: () => null },
}));

function createGroupsState(overrides: Record<string, unknown> = {}) {
  return {
    online: true,
    groups: {
      status: "ready",
      errorCode: null,
      items: [],
    },
    leaderboard: { selectedGroupId: null, selectedPeriod: "week", byGroup: {} },
    invites: { groupId: null, status: "idle", errorCode: null, items: [] },
    invitePreview: {
      status: "ready",
      errorCode: null,
      data: {
        alreadyActive: false,
        group: {
          id: "group-1",
          name: "Alpha Circle",
          timezone: "Europe/Berlin",
          leaderboardAnonymous: true,
          memberCount: "9",
        },
      },
    },
    mutation: { pending: false, kind: null, errorCode: null },
    refreshGroups: jest.fn(),
    createGroup: jest.fn(),
    loadLeaderboard: jest.fn(),
    setAnonymity: jest.fn(),
    loadInvites: jest.fn(),
    createInvite: jest.fn(),
    revokeInvite: jest.fn(),
    previewInvite: mockPreviewInvite,
    acceptInvite: mockAcceptInvite,
    ...overrides,
  };
}

describe("Task 15 join flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStatus = "ready";
    mockTokenParam = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    mockRememberInvite.mockResolvedValue(undefined);
    mockConsumePendingInvite.mockResolvedValue(null);
    mockPreviewInvite.mockResolvedValue(undefined);
    mockAcceptInvite.mockResolvedValue({
      group: {
        id: "group-1",
        name: "Alpha Circle",
        timezone: "Europe/Berlin",
        leaderboardAnonymous: true,
        memberCount: "9",
      },
      membership: {
        id: "membership-1",
        groupId: "group-1",
        joinedAt: "2026-08-31T12:00:00.000Z",
        createdAt: "2026-08-31T12:00:00.000Z",
        sharingConsentVersion: "mvp08-group-sharing-v1",
      },
      alreadyActive: false,
    });
    mockUseGroups.mockReturnValue(createGroupsState());
  });

  it("previews token invites and confirms join with secure token cleanup", async () => {
    const view = await render(<JoinTokenRoute />);

    await waitFor(() =>
      expect(mockPreviewInvite).toHaveBeenCalledWith(
        "token",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ),
    );
    expect(view.getByText("Alpha Circle")).toBeTruthy();
    expect(view.getByText("9 aktive Mitglieder")).toBeTruthy();
    expect(view.getByText(copy.joinSharingExplanation)).toBeTruthy();
    expect(view.getByText(copy.joinNoShareBeforeConfirm)).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Einladung annehmen" }));
    });

    await waitFor(() =>
      expect(mockAcceptInvite).toHaveBeenCalledWith(
        "token",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "de",
      ),
    );
    await waitFor(() => expect(mockConsumePendingInvite).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/groups/[id]",
      params: { id: "group-1" },
    });
  });

  it("shows an already-active hint in invite preview when returned by gateway", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        invitePreview: {
          status: "ready",
          errorCode: null,
          data: {
            alreadyActive: true,
            group: {
              id: "group-1",
              name: "Alpha Circle",
              timezone: "Europe/Berlin",
              leaderboardAnonymous: true,
              memberCount: "9",
            },
          },
        },
      }),
    );

    const view = await render(<JoinTokenRoute />);

    expect(view.getByText(copy.joinAlreadyActiveHint)).toBeTruthy();
  });

  it("manual route normalizes code input and submits preview requests", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const JoinManualRoute = require("@/app/join/index").default;
    const view = await render(<JoinManualRoute />);

    fireEvent.changeText(
      view.getByLabelText("Einladungscode"),
      "  abcd-2345 ef  ",
    );
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Einladung prüfen" }).props.accessibilityState
          .disabled,
      ).toBe(false),
    );
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Einladung prüfen" }));
    });

    await waitFor(() =>
      expect(mockPreviewInvite).toHaveBeenCalledWith("code", "ABCD2345EF"),
    );
  });

  it("clears stale preview data before requesting a preview for a new manual code", async () => {
    let resolvePreview: (() => void) | null = null;
    mockPreviewInvite.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePreview = resolve;
        }),
    );
    mockUseGroups.mockReturnValue(
      createGroupsState({
        invitePreview: {
          status: "ready",
          errorCode: null,
          data: {
            alreadyActive: false,
            group: {
              id: "group-stale",
              name: "Stale Circle",
              timezone: "Europe/Berlin",
              leaderboardAnonymous: false,
              memberCount: "5",
            },
          },
        },
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const JoinManualRoute = require("@/app/join/index").default;
    const view = await render(<JoinManualRoute />);

    fireEvent.changeText(view.getByLabelText("Einladungscode"), "ABCD2345EF");
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Einladung prüfen" }).props.accessibilityState
          .disabled,
      ).toBe(false),
    );
    await act(async () => {
      fireEvent.press(view.getByRole("button", { name: "Einladung prüfen" }));
    });

    await waitFor(() =>
      expect(mockPreviewInvite).toHaveBeenCalledWith("code", "ABCD2345EF"),
    );
    expect(view.queryByText("Stale Circle")).toBeNull();

    await act(async () => {
      resolvePreview?.();
    });
  });

  it("maps invalid invites to a neutral message while keeping offline and rate-limited errors distinct", async () => {
    mockUseGroups.mockReturnValue(
      createGroupsState({
        invitePreview: {
          status: "error",
          errorCode: "INVITE_INVALID",
          data: null,
        },
      }),
    );
    const invalid = await render(<JoinTokenRoute />);
    await waitFor(() =>
      expect(invalid.getByText(copy.joinInvalidInviteMessage)).toBeTruthy(),
    );

    mockUseGroups.mockReturnValue(
      createGroupsState({
        invitePreview: {
          status: "error",
          errorCode: "OFFLINE",
          data: null,
        },
      }),
    );
    const offline = await render(<JoinTokenRoute />);
    await waitFor(() =>
      expect(offline.getByText(copy.joinOfflineMessage)).toBeTruthy(),
    );

    mockUseGroups.mockReturnValue(
      createGroupsState({
        invitePreview: {
          status: "error",
          errorCode: "RATE_LIMITED",
          data: null,
        },
      }),
    );
    const rateLimited = await render(<JoinTokenRoute />);
    await waitFor(() =>
      expect(rateLimited.getByText(copy.joinRateLimitedMessage)).toBeTruthy(),
    );
  });
});
