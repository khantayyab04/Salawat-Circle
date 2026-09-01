import type { Database } from "@salawat-circle/shared-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GroupsError, getGroupsErrorCode } from "./errors";
import type {
  AcceptInviteResponse,
  AppLocale,
  CreateGroupResponse,
  CreateInviteOptions,
  CreateInviteResponse,
  GroupInvite,
  GroupInviteStatus,
  GroupInviteWithSecret,
  GroupLeaderboardCursor,
  GroupLeaderboardResponse,
  GroupLeaderboardRow,
  GroupMembership,
  GroupRole,
  GroupSnapshot,
  InviteKind,
  InvitePreviewGroup,
  LeaderboardPeriod,
  ListInvitesResponse,
  ListMyGroupsResponse,
  PreviewInviteResponse,
  RevokeInviteResponse,
  SetLeaderboardAnonymityResponse,
} from "./types";

export type GroupsGateway = {
  listMyGroups(): Promise<ListMyGroupsResponse>;
  createGroup(
    clientGroupId: string,
    name: string,
    timezone: string,
    leaderboardAnonymous: boolean,
    rulesAccepted: boolean,
  ): Promise<CreateGroupResponse>;
  getLeaderboard(
    groupId: string,
    period: LeaderboardPeriod,
    cursor: GroupLeaderboardCursor | null,
    limit: number,
  ): Promise<GroupLeaderboardResponse>;
  setLeaderboardAnonymity(
    groupId: string,
    anonymous: boolean,
    expectedRevision: number,
  ): Promise<SetLeaderboardAnonymityResponse>;
  createInvite(
    groupId: string,
    options?: CreateInviteOptions,
  ): Promise<CreateInviteResponse>;
  listInvites(groupId: string): Promise<ListInvitesResponse>;
  revokeInvite(groupId: string, inviteId: string): Promise<RevokeInviteResponse>;
  previewInvite(kind: InviteKind, secret: string): Promise<PreviewInviteResponse>;
  acceptInvite(
    kind: InviteKind,
    secret: string,
    locale: AppLocale,
  ): Promise<AcceptInviteResponse>;
};

type RpcResponse = {
  data: unknown;
  error: { message?: string; code?: string } | null;
  status?: number;
};

function asInvalidResponse(): never {
  throw new GroupsError("INVALID_RESPONSE");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    asInvalidResponse();
  }

  return value;
}

function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== "string" || field.length === 0) {
    asInvalidResponse();
  }

  return field;
}

function readNullableString(value: Record<string, unknown>, key: string): string | null {
  const field = value[key];
  if (field === null) {
    return null;
  }
  if (typeof field !== "string") {
    asInvalidResponse();
  }

  return field;
}

function toNumericString(field: unknown): string {
  if (typeof field === "string") {
    return field;
  }
  if (typeof field === "number" && Number.isFinite(field)) {
    return String(field);
  }

  asInvalidResponse();
}

function readNumericString(value: Record<string, unknown>, key: string): string {
  return toNumericString(value[key]);
}

function parseIntegerLike(field: unknown): number {
  if (typeof field === "number" && Number.isInteger(field)) {
    return field;
  }
  if (typeof field === "string" && /^-?\d+$/.test(field)) {
    const parsed = Number(field);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  asInvalidResponse();
}

function readInteger(value: Record<string, unknown>, key: string): number {
  return parseIntegerLike(value[key]);
}

function readNullableInteger(value: Record<string, unknown>, key: string): number | null {
  const field = value[key];
  if (field === null) {
    return null;
  }

  return parseIntegerLike(field);
}

function readBoolean(value: Record<string, unknown>, key: string): boolean {
  const field = value[key];
  if (typeof field !== "boolean") {
    asInvalidResponse();
  }

  return field;
}

function readRole(value: Record<string, unknown>, key: string): GroupRole {
  const field = value[key];
  if (field !== "owner" && field !== "member") {
    asInvalidResponse();
  }

  return field;
}

function readLeaderboardPeriod(
  value: Record<string, unknown>,
  key: string,
): LeaderboardPeriod {
  const field = value[key];
  if (field !== "week" && field !== "all_time") {
    asInvalidResponse();
  }

  return field;
}

function readInviteStatus(value: Record<string, unknown>, key: string): GroupInviteStatus {
  const field = value[key];
  if (
    field !== "active" &&
    field !== "expired" &&
    field !== "exhausted" &&
    field !== "revoked"
  ) {
    asInvalidResponse();
  }

  return field;
}

function readArray(value: Record<string, unknown>, key: string): unknown[] {
  const field = value[key];
  if (!Array.isArray(field)) {
    asInvalidResponse();
  }

  return field;
}

function parseStructuredDomainError(data: Record<string, unknown>): never {
  const nestedError = data.error;
  if (nestedError === null || nestedError === undefined) {
    asInvalidResponse();
  }

  if (!isRecord(nestedError) || typeof nestedError.code !== "string") {
    asInvalidResponse();
  }

  if (nestedError.code === "INVITE_INVALID" || nestedError.code === "RATE_LIMITED") {
    throw new GroupsError(nestedError.code);
  }

  asInvalidResponse();
}

function ensureRpcSuccess(response: RpcResponse): unknown {
  if (response.error) {
    throw new GroupsError(
      getGroupsErrorCode(
        response.status === undefined
          ? response.error
          : { ...response.error, status: response.status },
      ),
    );
  }

  if (isRecord(response.data) && "error" in response.data) {
    parseStructuredDomainError(response.data);
  }

  return response.data;
}

async function callRpc(
  client: SupabaseClient<Database>,
  name: keyof Database["public"]["Functions"],
  args?: Record<string, unknown>,
): Promise<unknown> {
  let response: RpcResponse;

  try {
    response = (await client.rpc(name, args as never)) as RpcResponse;
  } catch {
    throw new GroupsError("NETWORK");
  }

  return ensureRpcSuccess(response);
}

function parseGroupSnapshot(groupValue: unknown): GroupSnapshot {
  const group = readRecord(groupValue);

  return {
    id: readString(group, "id"),
    name: readString(group, "name"),
    timezone: readString(group, "timezone"),
    status: readString(group, "status"),
    leaderboardAnonymous: readBoolean(group, "leaderboard_anonymous"),
    createdAt: readString(group, "created_at"),
    updatedAt: readString(group, "updated_at"),
    revision: readInteger(group, "revision"),
  };
}

function parseGroupMembership(
  membershipValue: unknown,
  options?: { requireSharingConsentVersion?: boolean },
): GroupMembership {
  const membership = readRecord(membershipValue);
  const sharingConsentVersion = membership.sharing_consent_version;

  if (options?.requireSharingConsentVersion && typeof sharingConsentVersion !== "string") {
    asInvalidResponse();
  }

  if (
    sharingConsentVersion !== undefined &&
    sharingConsentVersion !== null &&
    typeof sharingConsentVersion !== "string"
  ) {
    asInvalidResponse();
  }

  return {
    id: readString(membership, "id"),
    groupId: readString(membership, "group_id"),
    joinedAt: readString(membership, "joined_at"),
    createdAt: readString(membership, "created_at"),
    sharingConsentVersion:
      typeof sharingConsentVersion === "string" ? sharingConsentVersion : undefined,
  };
}

function parseInvitePreviewGroup(groupValue: unknown): InvitePreviewGroup {
  const group = readRecord(groupValue);

  return {
    id: readString(group, "id"),
    name: readString(group, "name"),
    timezone: readString(group, "timezone"),
    leaderboardAnonymous: readBoolean(group, "leaderboard_anonymous"),
    memberCount: readNumericString(group, "member_count"),
  };
}

function parseInvite(inviteValue: unknown): GroupInvite {
  const invite = readRecord(inviteValue);

  return {
    id: readString(invite, "id"),
    groupId: readString(invite, "group_id"),
    expiresAt: readString(invite, "expires_at"),
    maxUses: readNumericString(invite, "max_uses"),
    useCount: readNumericString(invite, "use_count"),
    revokedAt: readNullableString(invite, "revoked_at"),
    createdAt: readString(invite, "created_at"),
    status: readInviteStatus(invite, "status"),
  };
}

function parseInviteWithSecret(inviteValue: unknown): GroupInviteWithSecret {
  const invite = readRecord(inviteValue);

  return {
    id: readString(invite, "id"),
    groupId: readString(invite, "group_id"),
    token: readString(invite, "token"),
    code: readString(invite, "code"),
    expiresAt: readString(invite, "expires_at"),
    maxUses: readNumericString(invite, "max_uses"),
    useCount: readNumericString(invite, "use_count"),
    revokedAt: readNullableString(invite, "revoked_at"),
    createdAt: readString(invite, "created_at"),
  };
}

function parseLeaderboardRow(rowValue: unknown): GroupLeaderboardRow {
  const row = readRecord(rowValue);

  return {
    rowId: readString(row, "row_id"),
    displayName: readString(row, "display_name"),
    total: readNumericString(row, "total"),
    rank: readInteger(row, "rank"),
    isSelf: readBoolean(row, "is_self"),
  };
}

function parseListMyGroupsResponse(dataValue: unknown): ListMyGroupsResponse {
  const data = readRecord(dataValue);

  return {
    items: readArray(data, "items").map((itemValue) => {
      const item = readRecord(itemValue);
      return {
        id: readString(item, "id"),
        name: readString(item, "name"),
        timezone: readString(item, "timezone"),
        role: readRole(item, "role"),
        memberCount: readNumericString(item, "member_count"),
        ownWeekTotal: readNumericString(item, "own_week_total"),
        ownRank: readInteger(item, "own_rank"),
        leaderboardAnonymous: readBoolean(item, "leaderboard_anonymous"),
        revision: readInteger(item, "revision"),
        updatedAt: readString(item, "updated_at"),
        calculatedAt: readString(item, "calculated_at"),
      };
    }),
  };
}

function parseCreateGroupResponse(dataValue: unknown): CreateGroupResponse {
  const data = readRecord(dataValue);

  return {
    group: parseGroupSnapshot(data.group),
    membership: parseGroupMembership(data.membership),
  };
}

function parseGroupLeaderboardResponse(dataValue: unknown): GroupLeaderboardResponse {
  const data = readRecord(dataValue);
  const group = readRecord(data.group);
  const cursor = data.next_cursor;

  let nextCursor: GroupLeaderboardCursor | null = null;
  if (cursor !== null) {
    const cursorRecord = readRecord(cursor);
    nextCursor = {
      rank: readInteger(cursorRecord, "rank"),
      sortName: readString(cursorRecord, "sort_name"),
      rowId: readString(cursorRecord, "row_id"),
    };
  }

  return {
    group: {
      id: readString(group, "id"),
      name: readString(group, "name"),
      timezone: readString(group, "timezone"),
      leaderboardAnonymous: readBoolean(group, "leaderboard_anonymous"),
      memberCount: readNumericString(group, "member_count"),
      role: readRole(group, "role"),
      isOwner: readBoolean(group, "is_owner"),
      revision: readInteger(group, "revision"),
    },
    period: readLeaderboardPeriod(data, "period"),
    periodStart: readNullableString(data, "period_start"),
    periodEnd: readNullableString(data, "period_end"),
    ownRank: readNullableInteger(data, "own_rank"),
    ownAlias: readNullableString(data, "own_alias"),
    items: readArray(data, "items").map(parseLeaderboardRow),
    nextCursor,
    hasMore: readBoolean(data, "has_more"),
    calculatedAt: readString(data, "calculated_at"),
  };
}

function parseSetLeaderboardAnonymityResponse(
  dataValue: unknown,
): SetLeaderboardAnonymityResponse {
  const data = readRecord(dataValue);
  return {
    group: parseGroupSnapshot(data.group),
  };
}

function parseCreateInviteResponse(dataValue: unknown): CreateInviteResponse {
  const data = readRecord(dataValue);

  return {
    invite: parseInviteWithSecret(data.invite),
  };
}

function parseListInvitesResponse(dataValue: unknown): ListInvitesResponse {
  const data = readRecord(dataValue);

  return {
    items: readArray(data, "items").map(parseInvite),
  };
}

function parseRevokeInviteResponse(dataValue: unknown): RevokeInviteResponse {
  const data = readRecord(dataValue);

  return {
    invite: parseInvite(data.invite),
  };
}

function parsePreviewInviteResponse(dataValue: unknown): PreviewInviteResponse {
  const data = readRecord(dataValue);

  return {
    group: parseInvitePreviewGroup(data.group),
    alreadyActive: readBoolean(data, "already_active"),
  };
}

function parseAcceptInviteResponse(dataValue: unknown): AcceptInviteResponse {
  const data = readRecord(dataValue);

  return {
    group: parseInvitePreviewGroup(data.group),
    membership: parseGroupMembership(data.membership, {
      requireSharingConsentVersion: true,
    }) as GroupMembership & { sharingConsentVersion: string },
    alreadyActive: readBoolean(data, "already_active"),
  };
}

export function createSupabaseGroupsGateway(
  client: SupabaseClient<Database>,
): GroupsGateway {
  return {
    async listMyGroups() {
      const data = await callRpc(client, "list_my_groups", undefined);
      return parseListMyGroupsResponse(data);
    },

    async createGroup(
      clientGroupId,
      name,
      timezone,
      leaderboardAnonymous,
      rulesAccepted,
    ) {
      const data = await callRpc(client, "create_group", {
        p_client_group_id: clientGroupId,
        p_name: name,
        p_timezone: timezone,
        p_leaderboard_anonymous: leaderboardAnonymous,
        p_rules_accepted: rulesAccepted,
      });
      return parseCreateGroupResponse(data);
    },

    async getLeaderboard(groupId, period, cursor, limit) {
      const cursorArgs = cursor
        ? {
            p_cursor_rank: cursor.rank,
            p_cursor_normalized_name: cursor.sortName,
            p_cursor_membership_id: cursor.rowId,
          }
        : {};

      const data = await callRpc(client, "get_group_leaderboard", {
        p_group_id: groupId,
        p_period: period,
        ...cursorArgs,
        p_limit: limit,
      });
      return parseGroupLeaderboardResponse(data);
    },

    async setLeaderboardAnonymity(groupId, anonymous, expectedRevision) {
      const data = await callRpc(client, "set_group_leaderboard_anonymity", {
        p_group_id: groupId,
        p_anonymous: anonymous,
        p_expected_revision: expectedRevision,
      });
      return parseSetLeaderboardAnonymityResponse(data);
    },

    async createInvite(groupId, options) {
      const data = await callRpc(client, "create_group_invite", {
        p_group_id: groupId,
        ...(options?.expiresInDays === undefined
          ? {}
          : { p_expires_in_days: options.expiresInDays }),
        ...(options?.maxUses === undefined ? {} : { p_max_uses: options.maxUses }),
      });
      return parseCreateInviteResponse(data);
    },

    async listInvites(groupId) {
      const data = await callRpc(client, "list_group_invites", {
        p_group_id: groupId,
      });
      return parseListInvitesResponse(data);
    },

    async revokeInvite(groupId, inviteId) {
      const data = await callRpc(client, "revoke_group_invite", {
        p_group_id: groupId,
        p_invite_id: inviteId,
      });
      return parseRevokeInviteResponse(data);
    },

    async previewInvite(kind, secret) {
      const data = await callRpc(client, "preview_group_invite", {
        p_kind: kind,
        p_secret: secret,
      });
      return parsePreviewInviteResponse(data);
    },

    async acceptInvite(kind, secret, locale) {
      const data = await callRpc(client, "accept_group_invite", {
        p_kind: kind,
        p_secret: secret,
        p_locale: locale,
      });
      return parseAcceptInviteResponse(data);
    },
  };
}
