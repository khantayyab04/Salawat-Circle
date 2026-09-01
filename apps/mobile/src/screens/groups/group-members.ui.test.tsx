import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, waitFor } from "@testing-library/react-native";
import GroupMembersRoute from "@/app/(tabs)/groups/[id]/members";

const mockLoadMembers = jest.fn<() => Promise<void>>();
const mockUseGroups = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "group-1" }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(callback, [callback]);
  },
  Stack: { Screen: () => null },
}));

jest.mock("@/lib/groups", () => ({
  useGroups: () => mockUseGroups(),
}));

jest.mock("@/localization", () => ({
  formatAppDate: () => "31.08.2026",
  useTranslation: () => ({
    localeTag: "de-DE",
    t: (key: string) =>
      ({
        groupMembersTitle: "Mitglieder",
        groupMembersOwner: "Inhaber",
        groupMembersMember: "Mitglied",
        groupDetailSelfLabel: "Du",
      })[key] ?? key,
  }),
}));

jest.mock("@/theme", () => {
  const actual = jest.requireActual<typeof import("@/theme")>("@/theme");
  return {
    ...actual,
    useAppTheme: () => ({ colors: actual.lightColors, isDark: false }),
  };
});

describe("GroupMembersRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadMembers.mockResolvedValue(undefined);
    mockUseGroups.mockReturnValue({
      online: true,
      groups: {
        items: [
          {
            id: "group-1",
            name: "Alpha Circle",
            leaderboardAnonymous: false,
          },
        ],
      },
      members: {
        groupId: "group-1",
        status: "ready",
        group: {
          id: "group-1",
          name: "Alpha Circle",
          timezone: "Europe/Berlin",
          leaderboardAnonymous: false,
          revision: 1,
        },
        items: [
          {
            membershipId: "member-1",
            displayName: "MVP Member",
            role: "member",
            joinedAt: "2026-08-31T10:00:00.000Z",
            isSelf: false,
          },
        ],
        nextCursor: null,
        hasMore: false,
        errorCode: null,
      },
      mutation: { pending: false, kind: null, errorCode: null },
      loadMembers: mockLoadMembers,
      removeMember: jest.fn(),
      transferGroupOwnership: jest.fn(),
    });
  });

  it("loads and renders active members instead of the unavailable placeholder", async () => {
    const view = await render(<GroupMembersRoute />);

    await waitFor(() => expect(view.getByText("MVP Member")).toBeTruthy());
    expect(mockLoadMembers).toHaveBeenCalledWith("group-1", { mode: "reset" });
  });
});
