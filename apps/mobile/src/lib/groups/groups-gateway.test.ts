import type { Database } from "@salawat-circle/shared-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { GroupsError } from "./errors";
import { createSupabaseGroupsGateway } from "./groups-gateway";

function createGateway(rpc: SupabaseClient<Database>["rpc"]) {
  return createSupabaseGroupsGateway({ rpc } as unknown as SupabaseClient<Database>);
}

describe("Supabase groups gateway", () => {
  it("lists caller groups and normalizes count totals as strings", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: "72a00000-0000-4000-8000-000000000001",
            name: "Contract Group",
            timezone: "Europe/Berlin",
            role: "owner",
            member_count: 2,
            own_week_total: "900719925474099300012345",
            own_rank: 1,
            leaderboard_anonymous: true,
            revision: 4,
            updated_at: "2026-08-31T20:00:00.000Z",
            calculated_at: "2026-08-31T20:00:01.000Z",
          },
        ],
        request_id: "rid-1",
        server_time: "2026-08-31T20:00:01.000Z",
      },
      error: null,
      status: 200,
    });
    const gateway = createGateway(rpc as SupabaseClient<Database>["rpc"]);

    await expect(gateway.listMyGroups()).resolves.toEqual({
      items: [
        {
          id: "72a00000-0000-4000-8000-000000000001",
          name: "Contract Group",
          timezone: "Europe/Berlin",
          role: "owner",
          memberCount: "2",
          ownWeekTotal: "900719925474099300012345",
          ownRank: 1,
          leaderboardAnonymous: true,
          revision: 4,
          updatedAt: "2026-08-31T20:00:00.000Z",
          calculatedAt: "2026-08-31T20:00:01.000Z",
        },
      ],
    });

    expect(rpc).toHaveBeenCalledWith("list_my_groups", undefined);
  });

  it("creates a group with the finalized five-argument RPC contract", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        group: {
          id: "72a00000-0000-4000-8000-000000000001",
          name: "Contract Group",
          timezone: "Europe/Berlin",
          status: "active",
          leaderboard_anonymous: false,
          created_at: "2026-08-31T19:00:00.000Z",
          updated_at: "2026-08-31T19:00:00.000Z",
          revision: 1,
        },
        membership: {
          id: "72b00000-0000-4000-8000-000000000001",
          group_id: "72a00000-0000-4000-8000-000000000001",
          joined_at: "2026-08-31T19:00:00.000Z",
          created_at: "2026-08-31T19:00:00.000Z",
        },
      },
      error: null,
      status: 200,
    });
    const gateway = createGateway(rpc as SupabaseClient<Database>["rpc"]);

    await expect(
      gateway.createGroup(
        "72a00000-0000-4000-8000-000000000001",
        "Contract Group",
        "Europe/Berlin",
        false,
        true,
      ),
    ).resolves.toEqual({
      group: {
        id: "72a00000-0000-4000-8000-000000000001",
        name: "Contract Group",
        timezone: "Europe/Berlin",
        status: "active",
        leaderboardAnonymous: false,
        createdAt: "2026-08-31T19:00:00.000Z",
        updatedAt: "2026-08-31T19:00:00.000Z",
        revision: 1,
      },
      membership: {
        id: "72b00000-0000-4000-8000-000000000001",
        groupId: "72a00000-0000-4000-8000-000000000001",
        joinedAt: "2026-08-31T19:00:00.000Z",
        createdAt: "2026-08-31T19:00:00.000Z",
      },
    });

    expect(rpc).toHaveBeenCalledWith("create_group", {
      p_client_group_id: "72a00000-0000-4000-8000-000000000001",
      p_name: "Contract Group",
      p_timezone: "Europe/Berlin",
      p_leaderboard_anonymous: false,
      p_rules_accepted: true,
    });
  });

  it("parses anonymous leaderboard pages and row_id/sort_name cursors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        group: {
          id: "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70",
          name: "Anonymous Group",
          timezone: "Europe/Berlin",
          leaderboard_anonymous: true,
          member_count: "2",
          role: "owner",
          is_owner: true,
          revision: 4,
        },
        period: "all_time",
        period_start: null,
        period_end: null,
        own_rank: 1,
        own_alias: "Ruhiger Garten",
        items: [
          {
            row_id: "11111111-1111-4111-8111-111111111111",
            display_name: "Ruhiger Garten",
            total: "900719925474099300000111",
            rank: 1,
            is_self: true,
          },
          {
            row_id: "22222222-2222-4222-8222-222222222222",
            display_name: "Sanfter Stern",
            total: "42",
            rank: 2,
            is_self: false,
          },
        ],
        next_cursor: {
          rank: 2,
          sort_name: "sanfter stern",
          row_id: "22222222-2222-4222-8222-222222222222",
        },
        has_more: true,
        calculated_at: "2026-08-31T20:00:01.000Z",
      },
      error: null,
      status: 200,
    });
    const gateway = createGateway(rpc as SupabaseClient<Database>["rpc"]);

    await expect(
      gateway.getLeaderboard(
        "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70",
        "all_time",
        {
          rank: 1,
          sortName: "ruhiger garten",
          rowId: "11111111-1111-4111-8111-111111111111",
        },
        20,
      ),
    ).resolves.toEqual({
      group: {
        id: "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70",
        name: "Anonymous Group",
        timezone: "Europe/Berlin",
        leaderboardAnonymous: true,
        memberCount: "2",
        role: "owner",
        isOwner: true,
        revision: 4,
      },
      period: "all_time",
      periodStart: null,
      periodEnd: null,
      ownRank: 1,
      ownAlias: "Ruhiger Garten",
      items: [
        {
          rowId: "11111111-1111-4111-8111-111111111111",
          displayName: "Ruhiger Garten",
          total: "900719925474099300000111",
          rank: 1,
          isSelf: true,
        },
        {
          rowId: "22222222-2222-4222-8222-222222222222",
          displayName: "Sanfter Stern",
          total: "42",
          rank: 2,
          isSelf: false,
        },
      ],
      nextCursor: {
        rank: 2,
        sortName: "sanfter stern",
        rowId: "22222222-2222-4222-8222-222222222222",
      },
      hasMore: true,
      calculatedAt: "2026-08-31T20:00:01.000Z",
    });

    expect(rpc).toHaveBeenCalledWith("get_group_leaderboard", {
      p_group_id: "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70",
      p_period: "all_time",
      p_cursor_rank: 1,
      p_cursor_normalized_name: "ruhiger garten",
      p_cursor_membership_id: "11111111-1111-4111-8111-111111111111",
      p_limit: 20,
    });
  });

  it("sets leaderboard anonymity and keeps P0001 domain code precedence", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          group: {
            id: "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70",
            name: "Anonymous Group",
            timezone: "Europe/Berlin",
            status: "active",
            leaderboard_anonymous: true,
            created_at: "2026-08-31T19:00:00.000Z",
            updated_at: "2026-08-31T20:00:00.000Z",
            revision: 2,
          },
        },
        error: null,
        status: 200,
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "P0001",
          message: "ENTRY_VERSION_CONFLICT",
        },
        status: 400,
      });

    const gateway = createGateway(rpc as SupabaseClient<Database>["rpc"]);

    await expect(
      gateway.setLeaderboardAnonymity(
        "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70",
        true,
        1,
      ),
    ).resolves.toEqual({
      group: {
        id: "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70",
        name: "Anonymous Group",
        timezone: "Europe/Berlin",
        status: "active",
        leaderboardAnonymous: true,
        createdAt: "2026-08-31T19:00:00.000Z",
        updatedAt: "2026-08-31T20:00:00.000Z",
        revision: 2,
      },
    });

    await expect(
      gateway.setLeaderboardAnonymity(
        "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70",
        true,
        1,
      ),
    ).rejects.toMatchObject({ code: "ENTRY_VERSION_CONFLICT" });
  });

  it("creates, lists, and revokes invites with safe metadata", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          invite: {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
            group_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            code: "ABCD2345EF",
            expires_at: "2026-09-07T10:00:00.000Z",
            max_uses: 25,
            use_count: 0,
            revoked_at: null,
            created_at: "2026-08-31T10:00:00.000Z",
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
              group_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
              expires_at: "2026-09-07T10:00:00.000Z",
              max_uses: "25",
              use_count: "1",
              revoked_at: null,
              created_at: "2026-08-31T10:00:00.000Z",
              status: "active",
            },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          invite: {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
            group_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            expires_at: "2026-09-07T10:00:00.000Z",
            max_uses: 25,
            use_count: 1,
            revoked_at: "2026-08-31T11:00:00.000Z",
            created_at: "2026-08-31T10:00:00.000Z",
            status: "revoked",
          },
        },
        error: null,
      });

    const gateway = createGateway(rpc as SupabaseClient<Database>["rpc"]);

    await expect(
      gateway.createInvite("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", {
        expiresInDays: 7,
        maxUses: 25,
      }),
    ).resolves.toEqual({
      invite: {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        groupId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        code: "ABCD2345EF",
        expiresAt: "2026-09-07T10:00:00.000Z",
        maxUses: "25",
        useCount: "0",
        revokedAt: null,
        createdAt: "2026-08-31T10:00:00.000Z",
      },
    });

    await expect(
      gateway.listInvites("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"),
    ).resolves.toEqual({
      items: [
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
          groupId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          expiresAt: "2026-09-07T10:00:00.000Z",
          maxUses: "25",
          useCount: "1",
          revokedAt: null,
          createdAt: "2026-08-31T10:00:00.000Z",
          status: "active",
        },
      ],
    });

    await expect(
      gateway.revokeInvite(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
      ),
    ).resolves.toEqual({
      invite: {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        groupId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        expiresAt: "2026-09-07T10:00:00.000Z",
        maxUses: "25",
        useCount: "1",
        revokedAt: "2026-08-31T11:00:00.000Z",
        createdAt: "2026-08-31T10:00:00.000Z",
        status: "revoked",
      },
    });

    expect(rpc).toHaveBeenNthCalledWith(1, "create_group_invite", {
      p_group_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      p_expires_in_days: 7,
      p_max_uses: 25,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "list_group_invites", {
      p_group_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    });
    expect(rpc).toHaveBeenNthCalledWith(3, "revoke_group_invite", {
      p_group_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      p_invite_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    });
  });

  it("previews and accepts invite payloads", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          group: {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            name: "Alpha Circle",
            timezone: "Europe/Berlin",
            leaderboard_anonymous: true,
            member_count: 12,
          },
          already_active: false,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          group: {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            name: "Alpha Circle",
            timezone: "Europe/Berlin",
            leaderboard_anonymous: true,
            member_count: "13",
          },
          membership: {
            id: "bbbbbbbb-0000-4000-8000-000000000002",
            group_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            joined_at: "2026-08-31T20:00:00.000Z",
            created_at: "2026-08-31T20:00:00.000Z",
            sharing_consent_version: "mvp08-group-sharing-v1",
          },
          already_active: false,
        },
        error: null,
      });

    const gateway = createGateway(rpc as SupabaseClient<Database>["rpc"]);

    await expect(
      gateway.previewInvite("code", "ABCD2345EF"),
    ).resolves.toEqual({
      group: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        name: "Alpha Circle",
        timezone: "Europe/Berlin",
        leaderboardAnonymous: true,
        memberCount: "12",
      },
      alreadyActive: false,
    });

    await expect(
      gateway.acceptInvite("token", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "de"),
    ).resolves.toEqual({
      group: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        name: "Alpha Circle",
        timezone: "Europe/Berlin",
        leaderboardAnonymous: true,
        memberCount: "13",
      },
      membership: {
        id: "bbbbbbbb-0000-4000-8000-000000000002",
        groupId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        joinedAt: "2026-08-31T20:00:00.000Z",
        createdAt: "2026-08-31T20:00:00.000Z",
        sharingConsentVersion: "mvp08-group-sharing-v1",
      },
      alreadyActive: false,
    });

    expect(rpc).toHaveBeenNthCalledWith(1, "preview_group_invite", {
      p_kind: "code",
      p_secret: "ABCD2345EF",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "accept_group_invite", {
      p_kind: "token",
      p_secret: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      p_locale: "de",
    });
  });

  it("throws typed domain errors from successful structured invite envelopes", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          error: {
            code: "INVITE_INVALID",
          },
          request_id: "rid-preview",
          server_time: "2026-08-31T20:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          error: {
            code: "RATE_LIMITED",
          },
          request_id: "rid-accept",
          server_time: "2026-08-31T20:00:00.000Z",
        },
        error: null,
      });

    const gateway = createGateway(rpc as SupabaseClient<Database>["rpc"]);

    await expect(gateway.previewInvite("code", "ABCD2345EF")).rejects.toMatchObject({
      code: "INVITE_INVALID",
    });
    await expect(
      gateway.acceptInvite("code", "ABCD2345EF", "de"),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it.each([
    {
      name: "listMyGroups",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({ data: { items: [{}] }, error: null }) as unknown as SupabaseClient<Database>["rpc"],
        ).listMyGroups(),
    },
    {
      name: "createGroup",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({
            data: {
              group: { id: "g" },
            },
            error: null,
          }) as unknown as SupabaseClient<Database>["rpc"],
        ).createGroup("id", "name", "Europe/Berlin", true, true),
    },
    {
      name: "getLeaderboard",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({
            data: {
              group: {
                id: "g",
                name: "n",
                timezone: "Europe/Berlin",
                leaderboard_anonymous: true,
                member_count: "1",
                role: "owner",
                is_owner: true,
                revision: 1,
              },
              period: "week",
              period_start: null,
              period_end: null,
              own_rank: null,
              own_alias: null,
              items: [{ rank: 1, display_name: "x", total: "1", is_self: false }],
              next_cursor: null,
              has_more: false,
              calculated_at: "2026-08-31T20:00:01.000Z",
            },
            error: null,
          }) as unknown as SupabaseClient<Database>["rpc"],
        ).getLeaderboard("id", "week", null, 20),
    },
    {
      name: "setLeaderboardAnonymity",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({ data: { group: null }, error: null }) as unknown as SupabaseClient<Database>["rpc"],
        ).setLeaderboardAnonymity("id", false, 1),
    },
    {
      name: "createInvite",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({ data: { invite: { id: "only-id" } }, error: null }) as unknown as SupabaseClient<Database>["rpc"],
        ).createInvite("id"),
    },
    {
      name: "listInvites",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({ data: { items: [{}] }, error: null }) as unknown as SupabaseClient<Database>["rpc"],
        ).listInvites("id"),
    },
    {
      name: "revokeInvite",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({ data: { invite: { status: "revoked" } }, error: null }) as unknown as SupabaseClient<Database>["rpc"],
        ).revokeInvite("id", "invite"),
    },
    {
      name: "previewInvite",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({ data: { group: { id: "id" } }, error: null }) as unknown as SupabaseClient<Database>["rpc"],
        ).previewInvite("token", "secret"),
    },
    {
      name: "acceptInvite",
      invoke: () =>
        createGateway(
          vi.fn().mockResolvedValue({ data: { group: { id: "id" } }, error: null }) as unknown as SupabaseClient<Database>["rpc"],
        ).acceptInvite("token", "secret", "de"),
    },
  ])("throws INVALID_RESPONSE for malformed $name payloads", async ({ invoke }) => {
    await expect(invoke()).rejects.toEqual(new GroupsError("INVALID_RESPONSE"));
  });

  it("maps rejected RPC calls to typed NETWORK errors", async () => {
    const gateway = createGateway(
      vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as SupabaseClient<Database>["rpc"],
    );

    await expect(gateway.listMyGroups()).rejects.toEqual(new GroupsError("NETWORK"));
  });
});
