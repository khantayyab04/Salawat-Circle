export type GroupRole = "owner" | "member";
export type LeaderboardPeriod = "week" | "all_time";
export type InviteKind = "token" | "code";
export type AppLocale = "de" | "en";

export type GroupSnapshot = {
  id: string;
  name: string;
  timezone: string;
  status: string;
  leaderboardAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type GroupMembership = {
  id: string;
  groupId: string;
  joinedAt: string;
  createdAt: string;
  sharingConsentVersion?: string;
};

export type GroupMemberCursor = {
  sortName: string;
  membershipId: string;
};

export type GroupMember = {
  membershipId: string;
  displayName: string;
  role: GroupRole;
  joinedAt: string;
  isSelf: boolean;
};

export type GroupMembersGroup = {
  id: string;
  name: string;
  timezone: string;
  leaderboardAnonymous: boolean;
  revision: number;
};

export type ListGroupMembersResponse = {
  group: GroupMembersGroup;
  items: GroupMember[];
  nextCursor: GroupMemberCursor | null;
  hasMore: boolean;
};

export type UpdateGroupNameResponse = {
  group: GroupSnapshot;
};

export type RemoveGroupMemberResponse = {
  group: GroupSnapshot;
  membershipId: string;
};

export type LeaveGroupResponse = {
  groupId: string;
  membershipId: string;
};

export type TransferGroupOwnershipResponse = {
  group: GroupSnapshot;
};

export type DeleteGroupResponse = {
  groupId: string;
};

export type GroupListItem = {
  id: string;
  name: string;
  timezone: string;
  role: GroupRole;
  memberCount: string;
  ownWeekTotal: string;
  ownRank: number;
  leaderboardAnonymous: boolean;
  revision: number;
  updatedAt: string;
  calculatedAt: string;
};

export type ListMyGroupsResponse = {
  items: GroupListItem[];
};

export type CreateGroupResponse = {
  group: GroupSnapshot;
  membership: GroupMembership;
};

export type GroupLeaderboardCursor = {
  rank: number;
  sortName: string;
  rowId: string;
};

export type GroupLeaderboardRow = {
  rowId: string;
  displayName: string;
  total: string;
  rank: number;
  isSelf: boolean;
};

export type GroupLeaderboardGroup = {
  id: string;
  name: string;
  timezone: string;
  leaderboardAnonymous: boolean;
  memberCount: string;
  role: GroupRole;
  isOwner: boolean;
  revision: number;
};

export type GroupLeaderboardResponse = {
  group: GroupLeaderboardGroup;
  period: LeaderboardPeriod;
  periodStart: string | null;
  periodEnd: string | null;
  ownRank: number | null;
  ownAlias: string | null;
  items: GroupLeaderboardRow[];
  nextCursor: GroupLeaderboardCursor | null;
  hasMore: boolean;
  calculatedAt: string;
};

export type SetLeaderboardAnonymityResponse = {
  group: GroupSnapshot;
};

export type SetGroupGoalResponse = {
  groupId: string;
  period: "week" | "month";
  effectiveFrom: string;
  amount: string;
  revision: number;
};

export type GroupInviteStatus = "active" | "expired" | "exhausted" | "revoked";

export type GroupInvite = {
  id: string;
  groupId: string;
  expiresAt: string;
  maxUses: string;
  useCount: string;
  revokedAt: string | null;
  createdAt: string;
  status: GroupInviteStatus;
};

export type GroupInviteWithSecret = Omit<GroupInvite, "status"> & {
  token: string;
  code: string;
};

export type CreateInviteOptions = {
  expiresInDays?: number;
  maxUses?: number;
};

export type CreateInviteResponse = {
  invite: GroupInviteWithSecret;
};

export type ListInvitesResponse = {
  items: GroupInvite[];
};

export type RevokeInviteResponse = {
  invite: GroupInvite;
};

export type InvitePreviewGroup = {
  id: string;
  name: string;
  timezone: string;
  leaderboardAnonymous: boolean;
  memberCount: string;
};

export type PreviewInviteResponse = {
  group: InvitePreviewGroup;
  alreadyActive: boolean;
};

export type AcceptInviteResponse = {
  group: InvitePreviewGroup;
  membership: GroupMembership & { sharingConsentVersion: string };
  alreadyActive: boolean;
};
