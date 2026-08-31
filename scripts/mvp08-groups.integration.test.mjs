import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";

const environment = Object.fromEntries(
  execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/u))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
const apiUrl = environment.API_URL;
const publicKey = environment.PUBLISHABLE_KEY ?? environment.ANON_KEY;
const mailpitUrl = environment.MAILPIT_URL ?? "http://127.0.0.1:54324";
const dbUrl = environment.DB_URL;

assert.ok(apiUrl, "Local Supabase API is not running");
assert.ok(publicKey, "Local Supabase public key is unavailable");
assert.ok(mailpitUrl, "Local Supabase mail capture URL is unavailable");
assert.ok(dbUrl, "Local Supabase DB_URL is unavailable for test SQL fixtures");
execFileSync("psql", ["--version"], { stdio: "ignore" });

const listMyGroupsContractKeys = [
  "calculated_at",
  "id",
  "leaderboard_anonymous",
  "member_count",
  "name",
  "own_rank",
  "own_week_total",
  "revision",
  "role",
  "timezone",
  "updated_at",
];

async function authRequest(path, body) {
  return fetch(`${apiUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: publicKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function requestOtp(email) {
  return authRequest("otp", { email, create_user: true });
}

async function findOtp(email) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const listResponse = await fetch(`${mailpitUrl}/api/v1/messages`);
    assert.equal(listResponse.ok, true, "Mailpit list endpoint failed");
    const list = await listResponse.json();
    const message = list.messages?.find((candidate) =>
      candidate.To?.some((recipient) => recipient.Address === email),
    );
    if (message) {
      const detailResponse = await fetch(`${mailpitUrl}/api/v1/message/${message.ID}`);
      assert.equal(detailResponse.ok, true, "Mailpit detail endpoint failed");
      const detail = await detailResponse.json();
      const otp = JSON.stringify(detail).match(/\b\d{6}\b/u)?.[0];
      if (otp) return otp;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error("No six-digit OTP arrived in Mailpit");
}

async function rpc(token, name, body = {}) {
  const response = await fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publicKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payloadText = await response.text();
  const payload = payloadText ? JSON.parse(payloadText) : null;
  return { response, payload };
}

async function rpcExpectOk(token, name, body = {}) {
  const { response, payload } = await rpc(token, name, body);
  assert.equal(response.ok, true, `${name} should succeed`);
  return payload;
}

async function rpcExpectNeutralTokenError(token, name, body, expectedMessage) {
  const { response, payload } = await rpc(token, name, body);
  assert.equal(response.ok, false, `${name} should fail neutrally`);
  assert.equal(payload?.message, expectedMessage, `${name} neutral message mismatch`);
}

function runSql(sql) {
  try {
    execFileSync("psql", [dbUrl, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", sql], {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || "Unknown SQL fixture error";
    throw new Error(`SQL fixture failed: ${detail}`);
  }
}

function readScalarSql(sql) {
  return execFileSync(
    "psql",
    [dbUrl, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

function getInviteFromList(listPayload, inviteId) {
  const invite = listPayload.items.find((item) => item.id === inviteId);
  assert.ok(invite, "Invite should be present in list_group_invites output");
  return invite;
}

function getLeaderboardRowById(leaderboardPayload, rowId) {
  const row = leaderboardPayload.items.find((item) => item.row_id === rowId);
  assert.ok(row, `Expected leaderboard row ${rowId} to exist`);
  return row;
}

function getSelfLeaderboardRow(leaderboardPayload) {
  const row = leaderboardPayload.items.find((item) => item.is_self === true);
  assert.ok(row, "Expected exactly one self leaderboard row");
  return row;
}

async function signInAndOnboard({ prefix, displayName, locale }) {
  const email = `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;
  const otpResponse = await requestOtp(email);
  assert.equal(otpResponse.ok, true, "OTP request should return neutral success");

  const otp = await findOtp(email);
  const verifyResponse = await authRequest("verify", {
    email,
    token: otp,
    type: "email",
  });
  assert.equal(verifyResponse.ok, true, "OTP verification should return a session");

  const session = await verifyResponse.json();
  const token = session.access_token;
  const userId = session.user?.id;
  assert.ok(token, "Session must contain an access token");
  assert.ok(userId, "Session must contain a user id");

  await rpcExpectOk(token, "upsert_my_profile", {
    p_display_name: displayName,
    p_timezone: "UTC",
    p_locale: locale,
  });
  await rpcExpectOk(token, "grant_core_consent", { p_locale: locale });

  return { token, userId, displayName, email };
}

async function createEntry(token, amount, entryDate, recordedAtClient) {
  return rpcExpectOk(token, "create_entry", {
    p_id: randomUUID(),
    p_amount: amount,
    p_entry_date: entryDate,
    p_timezone: "UTC",
    p_recorded_at_client: recordedAtClient,
  });
}

test(
  "MVP08 groups integration covers real local Supabase group flows",
  { timeout: 240_000 },
  async () => {
    const owner = await signInAndOnboard({
      prefix: "mvp08-owner",
      displayName: "Owner Real",
      locale: "de",
    });
    const member = await signInAndOnboard({
      prefix: "mvp08-member",
      displayName: "Member Real",
      locale: "en",
    });
    const raceA = await signInAndOnboard({
      prefix: "mvp08-race-a",
      displayName: "Race Alpha",
      locale: "en",
    });
    const raceB = await signInAndOnboard({
      prefix: "mvp08-race-b",
      displayName: "Race Beta",
      locale: "en",
    });

    const groupId = randomUUID();
    const created = await rpcExpectOk(owner.token, "create_group", {
      p_client_group_id: groupId,
      p_name: "Task 16 Circle",
      p_timezone: "UTC",
      p_leaderboard_anonymous: false,
      p_rules_accepted: true,
    });
    assert.equal(created.group.id, groupId, "create_group should persist caller-provided group id");
    assert.equal(created.group.leaderboard_anonymous, false, "group starts in named mode");
    assert.equal(created.group.revision, 1, "new group revision should start at 1");

    const ownerMembershipId = created.membership.id;

    const ownerGroups = await rpcExpectOk(owner.token, "list_my_groups");
    assert.equal(ownerGroups.items.length, 1, "owner should see exactly one active group");
    const ownerSummary = ownerGroups.items[0];
    assert.deepEqual(
      Object.keys(ownerSummary).sort(),
      [...listMyGroupsContractKeys].sort(),
      "list_my_groups item contract must match the finalized key set",
    );
    assert.equal(ownerSummary.id, groupId, "list_my_groups should include the created group id");
    assert.equal(ownerSummary.role, "owner", "owner summary role should be owner");
    assert.equal(ownerSummary.member_count, "1", "owner summary starts with one active member");
    assert.equal(ownerSummary.own_week_total, "0", "owner weekly total starts at zero");
    assert.equal(ownerSummary.own_rank, 1, "owner rank starts at one in a new solo group");
    assert.equal(ownerSummary.leaderboard_anonymous, false, "summary tracks named mode");
    assert.equal(ownerSummary.revision, 1, "summary carries current group revision");

    const initialInvite = (
      await rpcExpectOk(owner.token, "create_group_invite", {
        p_group_id: groupId,
      })
    ).invite;
    assert.match(initialInvite.token, /^[A-Za-z0-9_-]{43}$/u, "invite token shape must be URL-safe base64");
    assert.match(initialInvite.code, /^[A-HJKMNPQRSTUVWXYZ2-9]{10}$/u, "manual invite code shape must be stable");
    assert.equal(initialInvite.max_uses, 25, "create_group_invite defaults max_uses to 25");
    assert.equal(initialInvite.use_count, 0, "new invite starts with use_count 0");
    const defaultLifetimeSeconds =
      (Date.parse(initialInvite.expires_at) - Date.parse(initialInvite.created_at)) / 1000;
    assert.ok(
      Math.abs(defaultLifetimeSeconds - 7 * 24 * 60 * 60) <= 120,
      "create_group_invite defaults expiry to roughly seven days",
    );

    const previewByToken = await rpcExpectOk(member.token, "preview_group_invite", {
      p_kind: "token",
      p_secret: initialInvite.token,
    });
    assert.equal(previewByToken.group.id, groupId, "token preview must resolve the target group");
    assert.equal(previewByToken.already_active, false, "member is not active before first acceptance");

    const previewByCode = await rpcExpectOk(member.token, "preview_group_invite", {
      p_kind: "code",
      p_secret: initialInvite.code,
    });
    assert.equal(previewByCode.group.id, groupId, "manual code preview must resolve the target group");

    const acceptedMember = await rpcExpectOk(member.token, "accept_group_invite", {
      p_kind: "token",
      p_secret: initialInvite.token,
      p_locale: "en",
    });
    assert.equal(acceptedMember.already_active, false, "first acceptance should create a fresh membership");
    assert.equal(Number(acceptedMember.group.member_count), 2, "first acceptance increments group member_count");

    const memberMembershipId = acceptedMember.membership.id;
    const memberJoinedAt = acceptedMember.membership.joined_at;
    const joinedAtMillis = Date.parse(memberJoinedAt);
    assert.ok(Number.isFinite(joinedAtMillis), "accepted membership must expose a valid joined_at timestamp");

    const acceptedMemberAgain = await rpcExpectOk(member.token, "accept_group_invite", {
      p_kind: "token",
      p_secret: initialInvite.token,
      p_locale: "en",
    });
    assert.equal(acceptedMemberAgain.already_active, true, "duplicate acceptance should be idempotently active");
    assert.equal(
      acceptedMemberAgain.membership.id,
      memberMembershipId,
      "duplicate acceptance should return the existing membership id",
    );

    const inviteAfterRepeatAccept = getInviteFromList(
      await rpcExpectOk(owner.token, "list_group_invites", { p_group_id: groupId }),
      initialInvite.id,
    );
    assert.equal(
      Number(inviteAfterRepeatAccept.use_count),
      1,
      "idempotent duplicate acceptance must not increment invite use_count",
    );

    const entryDate = new Date().toISOString().slice(0, 10);
    await createEntry(member.token, 40, entryDate, new Date(joinedAtMillis - 60_000).toISOString());
    await createEntry(member.token, 60, entryDate, new Date(joinedAtMillis + 60_000).toISOString());
    await createEntry(owner.token, 30, entryDate, new Date(joinedAtMillis + 120_000).toISOString());

    const memberWeekBoard = await rpcExpectOk(member.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "week",
    });
    const memberAllTimeBoard = await rpcExpectOk(member.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    assert.equal(
      getLeaderboardRowById(memberWeekBoard, memberMembershipId).total,
      "60",
      "week leaderboard excludes entries recorded before joined_at",
    );
    assert.equal(
      getLeaderboardRowById(memberAllTimeBoard, memberMembershipId).total,
      "60",
      "all-time leaderboard excludes entries recorded before joined_at",
    );

    const ownerNamedBoard = await rpcExpectOk(owner.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "week",
    });
    assert.equal(ownerNamedBoard.own_alias, null, "named leaderboard should keep own_alias null");
    assert.equal(
      getLeaderboardRowById(ownerNamedBoard, ownerMembershipId).display_name,
      owner.displayName,
      "named leaderboard keeps owner real display name",
    );
    assert.equal(
      getLeaderboardRowById(ownerNamedBoard, memberMembershipId).display_name,
      member.displayName,
      "named leaderboard keeps member real display name",
    );

    const enabledAnonymity = await rpcExpectOk(owner.token, "set_group_leaderboard_anonymity", {
      p_group_id: groupId,
      p_anonymous: true,
      p_expected_revision: ownerNamedBoard.group.revision,
    });
    assert.equal(enabledAnonymity.group.leaderboard_anonymous, true, "owner can enable anonymity");
    assert.equal(
      enabledAnonymity.group.revision,
      ownerNamedBoard.group.revision + 1,
      "enabling anonymity increments revision by one",
    );

    const ownerAnonymousBoardV1 = await rpcExpectOk(owner.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    const ownerSelfAnonymousV1 = getSelfLeaderboardRow(ownerAnonymousBoardV1);
    assert.equal(
      ownerSelfAnonymousV1.display_name,
      owner.displayName,
      "owner still sees own real name in anonymous mode",
    );
    assert.ok(
      typeof ownerAnonymousBoardV1.own_alias === "string" && ownerAnonymousBoardV1.own_alias.length > 0,
      "owner receives own_alias in anonymous mode",
    );
    assert.notEqual(
      ownerSelfAnonymousV1.row_id,
      ownerMembershipId,
      "anonymous mode row_id should not expose owner membership id",
    );

    const memberRowForOwnerAnonV1 = ownerAnonymousBoardV1.items.find(
      (item) => item.row_id !== ownerSelfAnonymousV1.row_id,
    );
    assert.ok(memberRowForOwnerAnonV1, "owner should see a foreign member row in anonymous mode");
    assert.notEqual(
      memberRowForOwnerAnonV1.display_name,
      member.displayName,
      "owner sees member alias instead of member real name in anonymous mode",
    );
    assert.notEqual(
      memberRowForOwnerAnonV1.row_id,
      memberMembershipId,
      "anonymous mode foreign row_id should not expose membership id",
    );

    const firstForeignAnonRowId = memberRowForOwnerAnonV1.row_id;
    const firstOwnerAnonRowId = ownerSelfAnonymousV1.row_id;
    const ownerAliasInAnonymousV1 = ownerAnonymousBoardV1.own_alias;

    const memberAnonymousBoard = await rpcExpectOk(member.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    const memberSelfAnonymousRow = getSelfLeaderboardRow(memberAnonymousBoard);
    assert.equal(
      memberSelfAnonymousRow.display_name,
      member.displayName,
      "member sees own real name in anonymous mode",
    );
    const ownerRowAsSeenByMember = memberAnonymousBoard.items.find((item) => !item.is_self);
    assert.ok(ownerRowAsSeenByMember, "member should see an owner row in anonymous mode");
    assert.equal(
      ownerRowAsSeenByMember.display_name,
      ownerAliasInAnonymousV1,
      "member should see owner alias provided by owner own_alias",
    );

    const disabledAnonymity = await rpcExpectOk(owner.token, "set_group_leaderboard_anonymity", {
      p_group_id: groupId,
      p_anonymous: false,
      p_expected_revision: enabledAnonymity.group.revision,
    });
    assert.equal(disabledAnonymity.group.leaderboard_anonymous, false, "owner can disable anonymity");
    assert.equal(
      disabledAnonymity.group.revision,
      enabledAnonymity.group.revision + 1,
      "disabling anonymity increments revision by one",
    );

    const ownerNamedAfterDisable = await rpcExpectOk(owner.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    assert.equal(
      getLeaderboardRowById(ownerNamedAfterDisable, memberMembershipId).display_name,
      member.displayName,
      "named mode restore returns member real name",
    );

    const enabledAnonymityAgain = await rpcExpectOk(owner.token, "set_group_leaderboard_anonymity", {
      p_group_id: groupId,
      p_anonymous: true,
      p_expected_revision: disabledAnonymity.group.revision,
    });
    assert.equal(enabledAnonymityAgain.group.leaderboard_anonymous, true, "owner can re-enable anonymity");
    assert.equal(
      enabledAnonymityAgain.group.revision,
      disabledAnonymity.group.revision + 1,
      "re-enabling anonymity increments revision by one",
    );

    const ownerAnonymousBoardV2 = await rpcExpectOk(owner.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    const ownerSelfAnonymousV2 = getSelfLeaderboardRow(ownerAnonymousBoardV2);
    const memberRowForOwnerAnonV2 = ownerAnonymousBoardV2.items.find(
      (item) => item.row_id !== ownerSelfAnonymousV2.row_id,
    );
    assert.ok(memberRowForOwnerAnonV2, "owner should still see foreign row after re-enabling anonymity");
    assert.notEqual(
      ownerSelfAnonymousV2.row_id,
      firstOwnerAnonRowId,
      "owner anonymous row_id rotates after disable/re-enable",
    );
    assert.notEqual(
      memberRowForOwnerAnonV2.row_id,
      firstForeignAnonRowId,
      "member anonymous row_id rotates after disable/re-enable",
    );

    const revokedInvite = (
      await rpcExpectOk(owner.token, "create_group_invite", {
        p_group_id: groupId,
      })
    ).invite;
    await rpcExpectOk(owner.token, "revoke_group_invite", {
      p_group_id: groupId,
      p_invite_id: revokedInvite.id,
    });
    await rpcExpectNeutralTokenError(raceA.token, "preview_group_invite", {
      p_kind: "token",
      p_secret: revokedInvite.token,
    }, "INVITE_INVALID");
    await rpcExpectNeutralTokenError(raceA.token, "accept_group_invite", {
      p_kind: "token",
      p_secret: revokedInvite.token,
      p_locale: "en",
    }, "INVITE_INVALID");

    const expiredInvite = (
      await rpcExpectOk(owner.token, "create_group_invite", {
        p_group_id: groupId,
      })
    ).invite;
    runSql(`
      update private.group_invites
      set created_at = pg_catalog.clock_timestamp() - interval '8 days',
          expires_at = pg_catalog.clock_timestamp() - interval '5 minutes'
      where id = '${expiredInvite.id}'::uuid;
    `);
    assert.equal(
      readScalarSql(`
        select count(*)
        from private.group_invites
        where id = '${expiredInvite.id}'::uuid
          and expires_at <= pg_catalog.clock_timestamp();
      `),
      "1",
      "test-only SQL fixture should force invite expiry before validation",
    );
    await rpcExpectNeutralTokenError(raceB.token, "preview_group_invite", {
      p_kind: "token",
      p_secret: expiredInvite.token,
    }, "INVITE_INVALID");
    await rpcExpectNeutralTokenError(raceB.token, "accept_group_invite", {
      p_kind: "token",
      p_secret: expiredInvite.token,
      p_locale: "en",
    }, "INVITE_INVALID");

    const invalidManualCodePreview = await rpcExpectOk(raceB.token, "preview_group_invite", {
      p_kind: "code",
      p_secret: "ZZZZ2345ZZ",
    });
    assert.equal(
      invalidManualCodePreview.error?.code,
      "INVITE_INVALID",
      "invalid manual code preview should return structured neutral error",
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(invalidManualCodePreview, "group"),
      false,
      "invalid manual code preview must not leak group metadata",
    );

    const raceInvite = (
      await rpcExpectOk(owner.token, "create_group_invite", {
        p_group_id: groupId,
        p_max_uses: 1,
      })
    ).invite;
    const raceAcceptBody = {
      p_kind: "token",
      p_secret: raceInvite.token,
      p_locale: "en",
    };

    const [raceResultA, raceResultB] = await Promise.all([
      rpc(raceA.token, "accept_group_invite", raceAcceptBody),
      rpc(raceB.token, "accept_group_invite", raceAcceptBody),
    ]);

    const raceOutcomes = [
      { actor: "raceA", ...raceResultA },
      { actor: "raceB", ...raceResultB },
    ];
    const raceSuccesses = raceOutcomes.filter(
      (outcome) => outcome.response.ok && outcome.payload?.membership && outcome.payload?.already_active === false,
    );
    const raceNeutralFailures = raceOutcomes.filter(
      (outcome) => !outcome.response.ok && outcome.payload?.message === "INVITE_INVALID",
    );

    assert.equal(
      raceSuccesses.length,
      1,
      "exactly one contender should create a membership in max_uses=1 invite race",
    );
    assert.equal(
      raceNeutralFailures.length,
      1,
      "exactly one contender should receive neutral INVITE_INVALID in max_uses=1 invite race",
    );

    const raceInviteAfter = getInviteFromList(
      await rpcExpectOk(owner.token, "list_group_invites", { p_group_id: groupId }),
      raceInvite.id,
    );
    assert.equal(Number(raceInviteAfter.use_count), 1, "invite race must persist exactly one use_count increment");

    const [groupsRaceA, groupsRaceB] = await Promise.all([
      rpcExpectOk(raceA.token, "list_my_groups"),
      rpcExpectOk(raceB.token, "list_my_groups"),
    ]);
    const raceJoinFlags = [
      groupsRaceA.items.some((item) => item.id === groupId),
      groupsRaceB.items.some((item) => item.id === groupId),
    ];
    assert.equal(
      raceJoinFlags.filter(Boolean).length,
      1,
      "exactly one race account should end with active group membership",
    );

    const ownerBoardAfterRace = await rpcExpectOk(owner.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    assert.equal(
      ownerBoardAfterRace.group.member_count,
      "3",
      "group member_count remains consistent after invite race",
    );
  },
);
