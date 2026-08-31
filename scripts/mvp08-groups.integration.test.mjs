import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
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
const listGroupInvitesContractKeys = [
  "created_at",
  "expires_at",
  "group_id",
  "id",
  "max_uses",
  "revoked_at",
  "status",
  "use_count",
];
const inviteSecretContractKeys = ["token", "code", "token_hash", "code_hash"];
const postgrestInviteErrorKeys = ["code", "details", "hint", "message"];
const manualInviteErrorEnvelopeKeys = ["error", "request_id", "server_time"];
const anonymousAliasPattern = /^\p{Lu}\p{Ll}+ \p{Lu}\p{Ll}+(?: [1-9]\d*)?$/u;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/u;
const manualCodePattern = /^[A-HJKMNPQRSTUVWXYZ2-9]{10}$/u;

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

async function rpcExpectNeutralTokenError(token, name, body) {
  const { response, payload } = await rpc(token, name, body);
  assert.equal(response.ok, false, `${name} should fail neutrally`);
  assert.equal(payload?.message, "INVITE_INVALID", `${name} neutral message mismatch`);
  assert.equal(payload?.code, "P0001", `${name} neutral error code mismatch`);
  assert.equal(payload?.details ?? null, null, `${name} neutral details must stay null`);
  assert.equal(payload?.hint ?? null, null, `${name} neutral hint must stay null`);
  assert.deepEqual(
    Object.keys(payload ?? {}).sort(),
    [...postgrestInviteErrorKeys].sort(),
    `${name} neutral token error payload keys must stay stable`,
  );

  return {
    status: response.status,
    code: payload?.code ?? null,
    message: payload?.message ?? null,
    details: payload?.details ?? null,
    hint: payload?.hint ?? null,
  };
}

function assertSameNeutralTokenErrorShape(actual, expected, context) {
  assert.deepEqual(
    actual,
    expected,
    `${context} should keep the same neutral PostgREST token error shape`,
  );
}

async function rpcExpectNeutralManualCodeError(token, name, body) {
  const { response, payload } = await rpc(token, name, body);
  assert.equal(response.status, 200, `${name} manual-code neutral status should be HTTP 200`);
  assert.equal(response.ok, true, `${name} manual-code neutral response should stay ok=true`);
  assert.equal(payload?.error?.code, "INVITE_INVALID", `${name} manual-code neutral error code mismatch`);
  assert.equal(
    Object.prototype.hasOwnProperty.call(payload ?? {}, "group"),
    false,
    `${name} manual-code neutral response must not include group metadata`,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(payload ?? {}, "membership"),
    false,
    `${name} manual-code neutral response must not include membership metadata`,
  );
  assert.deepEqual(
    Object.keys(payload ?? {}).sort(),
    [...manualInviteErrorEnvelopeKeys].sort(),
    `${name} manual-code neutral payload keys must stay stable`,
  );
  assert.deepEqual(
    Object.keys(payload?.error ?? {}).sort(),
    ["code"],
    `${name} manual-code error payload should only expose code`,
  );

  return {
    status: response.status,
    ok: response.ok,
    errorCode: payload?.error?.code ?? null,
    envelopeKeys: Object.keys(payload ?? {}).sort(),
    errorKeys: Object.keys(payload?.error ?? {}).sort(),
  };
}

function assertSameNeutralManualCodeErrorShape(actual, expected, context) {
  assert.deepEqual(
    actual,
    expected,
    `${context} should keep the same manual-code neutral error envelope`,
  );
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
  try {
    return execFileSync(
      "psql",
      [dbUrl, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", sql],
      { encoding: "utf8", stdio: "pipe" },
    ).trim();
  } catch (error) {
    const detail = error.stderr?.toString().trim() || "Unknown SQL scalar fixture error";
    throw new Error(`SQL scalar fixture failed: ${detail}`);
  }
}

function assertAnonymousAlias(alias, context) {
  assert.equal(typeof alias, "string", `${context} should be a string alias`);
  assert.match(alias, anonymousAliasPattern, `${context} must follow adjective+noun(+number) alias format`);
  assert.notEqual(alias, "Mitglied", `${context} must not collapse to Mitglied fallback`);
}

function assertInviteListPayloadSafe(listPayload, context) {
  for (const item of listPayload.items) {
    assert.deepEqual(
      Object.keys(item).sort(),
      [...listGroupInvitesContractKeys].sort(),
      `${context} invite rows must keep the safe list_group_invites contract`,
    );
    for (const key of inviteSecretContractKeys) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(item, key),
        false,
        `${context} invite rows must not expose ${key}`,
      );
    }
  }
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
  const selfRows = leaderboardPayload.items.filter((item) => item.is_self === true);
  assert.equal(selfRows.length, 1, "Expected exactly one self leaderboard row");
  return selfRows[0];
}

function assertLeaderboardCardinality(leaderboardPayload, expectedItems, context) {
  assert.equal(
    leaderboardPayload.items.length,
    expectedItems,
    `${context} should return exactly ${expectedItems} leaderboard items`,
  );
  assert.equal(
    leaderboardPayload.items.filter((item) => item.is_self === true).length,
    1,
    `${context} should include exactly one self row`,
  );
  assert.equal(
    Number(leaderboardPayload.group.member_count),
    expectedItems,
    `${context} member_count should match returned items for this fixture`,
  );
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
    // Each run is preceded by supabase:reset, so this single flow can assume isolated fixture state.
    // We intentionally keep onboarding at four OTP accounts to stay within a predictable email budget.
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
    assert.match(initialInvite.token, tokenPattern, "invite token shape must be URL-safe base64");
    assert.match(initialInvite.code, manualCodePattern, "manual invite code shape must be stable");
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

    const invitesAfterRepeatAccept = await rpcExpectOk(owner.token, "list_group_invites", {
      p_group_id: groupId,
    });
    assertInviteListPayloadSafe(invitesAfterRepeatAccept, "post-accept invite listing");
    const inviteAfterRepeatAccept = getInviteFromList(invitesAfterRepeatAccept, initialInvite.id);
    assert.equal(
      Number(inviteAfterRepeatAccept.use_count),
      1,
      "idempotent duplicate acceptance must not increment invite use_count",
    );
    assert.equal(
      inviteAfterRepeatAccept.status,
      "active",
      "partially used invite with remaining capacity stays active",
    );

    const entryDate = new Date().toISOString().slice(0, 10);
    await createEntry(member.token, 40, entryDate, new Date(joinedAtMillis - 60_000).toISOString());
    await createEntry(member.token, 5, entryDate, memberJoinedAt);
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
    assertLeaderboardCardinality(memberWeekBoard, 2, "member week leaderboard");
    assertLeaderboardCardinality(memberAllTimeBoard, 2, "member all-time leaderboard");
    assert.equal(
      getLeaderboardRowById(memberWeekBoard, memberMembershipId).total,
      "65",
      "week leaderboard includes joined_at equality and excludes before-joined_at entries",
    );
    assert.equal(
      getLeaderboardRowById(memberAllTimeBoard, memberMembershipId).total,
      "65",
      "all-time leaderboard includes joined_at equality and excludes before-joined_at entries",
    );

    const ownerNamedBoard = await rpcExpectOk(owner.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "week",
    });
    assertLeaderboardCardinality(ownerNamedBoard, 2, "owner named leaderboard");
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
    assertLeaderboardCardinality(ownerAnonymousBoardV1, 2, "owner anonymous leaderboard v1");
    const ownerSelfAnonymousV1 = getSelfLeaderboardRow(ownerAnonymousBoardV1);
    assert.equal(
      ownerSelfAnonymousV1.display_name,
      owner.displayName,
      "owner still sees own real name in anonymous mode",
    );
    assertAnonymousAlias(ownerAnonymousBoardV1.own_alias, "owner own_alias");
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
    assertAnonymousAlias(memberRowForOwnerAnonV1.display_name, "member alias as seen by owner");
    assert.notEqual(
      memberRowForOwnerAnonV1.row_id,
      memberMembershipId,
      "anonymous mode foreign row_id should not expose membership id",
    );
    assert.notEqual(
      memberRowForOwnerAnonV1.display_name,
      ownerAnonymousBoardV1.own_alias,
      "owner and member aliases must stay distinct in anonymous mode",
    );

    const firstForeignAnonRowId = memberRowForOwnerAnonV1.row_id;
    const firstOwnerAnonRowId = ownerSelfAnonymousV1.row_id;
    const ownerAliasInAnonymousV1 = ownerAnonymousBoardV1.own_alias;

    const memberAnonymousBoard = await rpcExpectOk(member.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    assertLeaderboardCardinality(memberAnonymousBoard, 2, "member anonymous leaderboard");
    assertAnonymousAlias(memberAnonymousBoard.own_alias, "member own_alias");
    const memberSelfAnonymousRow = getSelfLeaderboardRow(memberAnonymousBoard);
    assert.equal(
      memberSelfAnonymousRow.display_name,
      member.displayName,
      "member sees own real name in anonymous mode",
    );
    assert.notEqual(
      memberAnonymousBoard.own_alias,
      ownerAliasInAnonymousV1,
      "owner and member own_alias values must stay distinct",
    );
    const ownerRowAsSeenByMember = memberAnonymousBoard.items.find((item) => !item.is_self);
    assert.ok(ownerRowAsSeenByMember, "member should see an owner row in anonymous mode");
    assert.equal(
      ownerRowAsSeenByMember.display_name,
      ownerAliasInAnonymousV1,
      "member should see owner alias provided by owner own_alias",
    );
    assertAnonymousAlias(ownerRowAsSeenByMember.display_name, "owner alias as seen by member");
    assert.equal(
      memberAnonymousBoard.own_alias,
      memberRowForOwnerAnonV1.display_name,
      "member own_alias should match the alias seen by owner for that member",
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
    assertLeaderboardCardinality(ownerNamedAfterDisable, 2, "owner named leaderboard after disable");
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
    assertLeaderboardCardinality(ownerAnonymousBoardV2, 2, "owner anonymous leaderboard v2");
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
    const invitesAfterRevoke = await rpcExpectOk(owner.token, "list_group_invites", { p_group_id: groupId });
    assertInviteListPayloadSafe(invitesAfterRevoke, "post-revoke invite listing");
    assert.equal(
      getInviteFromList(invitesAfterRevoke, revokedInvite.id).status,
      "revoked",
      "revoked invite should surface as revoked in list_group_invites",
    );

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
    const invitesAfterExpiryFixture = await rpcExpectOk(owner.token, "list_group_invites", {
      p_group_id: groupId,
    });
    assertInviteListPayloadSafe(invitesAfterExpiryFixture, "post-expiry fixture invite listing");
    assert.equal(
      getInviteFromList(invitesAfterExpiryFixture, expiredInvite.id).status,
      "expired",
      "forced-expired invite should surface as expired in list_group_invites",
    );

    const unknownToken = randomBytes(32).toString("base64url");
    assert.match(unknownToken, tokenPattern, "unknown token fixture must be well-formed");
    assert.notEqual(unknownToken, revokedInvite.token, "unknown token fixture must not reuse revoked secret");
    assert.notEqual(unknownToken, expiredInvite.token, "unknown token fixture must not reuse expired secret");

    const previewUnknownTokenNeutral = await rpcExpectNeutralTokenError(raceA.token, "preview_group_invite", {
      p_kind: "token",
      p_secret: unknownToken,
    });
    const previewRevokedTokenNeutral = await rpcExpectNeutralTokenError(raceA.token, "preview_group_invite", {
      p_kind: "token",
      p_secret: revokedInvite.token,
    });
    const previewExpiredTokenNeutral = await rpcExpectNeutralTokenError(raceA.token, "preview_group_invite", {
      p_kind: "token",
      p_secret: expiredInvite.token,
    });
    assertSameNeutralTokenErrorShape(
      previewRevokedTokenNeutral,
      previewUnknownTokenNeutral,
      "revoked token preview",
    );
    assertSameNeutralTokenErrorShape(
      previewExpiredTokenNeutral,
      previewUnknownTokenNeutral,
      "expired token preview",
    );

    const acceptUnknownTokenNeutral = await rpcExpectNeutralTokenError(raceA.token, "accept_group_invite", {
      p_kind: "token",
      p_secret: unknownToken,
      p_locale: "en",
    });
    const acceptRevokedTokenNeutral = await rpcExpectNeutralTokenError(raceA.token, "accept_group_invite", {
      p_kind: "token",
      p_secret: revokedInvite.token,
      p_locale: "en",
    });
    const acceptExpiredTokenNeutral = await rpcExpectNeutralTokenError(raceA.token, "accept_group_invite", {
      p_kind: "token",
      p_secret: expiredInvite.token,
      p_locale: "en",
    });
    assertSameNeutralTokenErrorShape(
      acceptRevokedTokenNeutral,
      acceptUnknownTokenNeutral,
      "revoked token accept",
    );
    assertSameNeutralTokenErrorShape(
      acceptExpiredTokenNeutral,
      acceptUnknownTokenNeutral,
      "expired token accept",
    );

    const unknownManualCode = "ZZZZ2345ZZ";
    assert.match(unknownManualCode, manualCodePattern, "unknown manual-code fixture must be well-formed");
    assert.notEqual(
      unknownManualCode,
      revokedInvite.code,
      "unknown manual-code fixture must not reuse revoked secret",
    );
    assert.notEqual(
      unknownManualCode,
      expiredInvite.code,
      "unknown manual-code fixture should differ from expired code fixture",
    );

    const previewUnknownManualNeutral = await rpcExpectNeutralManualCodeError(raceB.token, "preview_group_invite", {
      p_kind: "code",
      p_secret: unknownManualCode,
    });
    const previewRevokedManualNeutral = await rpcExpectNeutralManualCodeError(raceB.token, "preview_group_invite", {
      p_kind: "code",
      p_secret: revokedInvite.code,
    });
    const previewExpiredManualNeutral = await rpcExpectNeutralManualCodeError(raceB.token, "preview_group_invite", {
      p_kind: "code",
      p_secret: expiredInvite.code,
    });
    assertSameNeutralManualCodeErrorShape(
      previewRevokedManualNeutral,
      previewUnknownManualNeutral,
      "revoked manual-code preview",
    );
    assertSameNeutralManualCodeErrorShape(
      previewExpiredManualNeutral,
      previewUnknownManualNeutral,
      "expired manual-code preview",
    );

    const acceptUnknownManualNeutral = await rpcExpectNeutralManualCodeError(raceA.token, "accept_group_invite", {
      p_kind: "code",
      p_secret: unknownManualCode,
      p_locale: "en",
    });
    const acceptRevokedManualNeutral = await rpcExpectNeutralManualCodeError(raceA.token, "accept_group_invite", {
      p_kind: "code",
      p_secret: revokedInvite.code,
      p_locale: "en",
    });
    const acceptExpiredManualNeutral = await rpcExpectNeutralManualCodeError(raceA.token, "accept_group_invite", {
      p_kind: "code",
      p_secret: expiredInvite.code,
      p_locale: "en",
    });
    assertSameNeutralManualCodeErrorShape(
      acceptRevokedManualNeutral,
      acceptUnknownManualNeutral,
      "revoked manual-code accept",
    );
    assertSameNeutralManualCodeErrorShape(
      acceptExpiredManualNeutral,
      acceptUnknownManualNeutral,
      "expired manual-code accept",
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
    assert.equal(
      raceNeutralFailures[0].payload?.details ?? null,
      null,
      "max_uses race neutral token failure keeps details null",
    );
    assert.equal(
      raceNeutralFailures[0].payload?.hint ?? null,
      null,
      "max_uses race neutral token failure keeps hint null",
    );

    const invitesAfterRace = await rpcExpectOk(owner.token, "list_group_invites", { p_group_id: groupId });
    assertInviteListPayloadSafe(invitesAfterRace, "post-race invite listing");
    const raceInviteAfter = getInviteFromList(invitesAfterRace, raceInvite.id);
    assert.equal(Number(raceInviteAfter.use_count), 1, "invite race must persist exactly one use_count increment");
    assert.equal(
      raceInviteAfter.status,
      "exhausted",
      "fully consumed max_uses=1 invite should surface as exhausted",
    );

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

    const raceWinner = raceSuccesses[0];
    const raceWinnerAccount = raceWinner.actor === "raceA" ? raceA : raceB;
    const raceWinnerMembershipId = raceWinner.payload.membership.id;
    const raceWinnerBoardAfterRace = await rpcExpectOk(raceWinnerAccount.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    assertLeaderboardCardinality(
      raceWinnerBoardAfterRace,
      3,
      "race winner anonymous leaderboard after max_uses race",
    );
    const raceWinnerSelfRow = getSelfLeaderboardRow(raceWinnerBoardAfterRace);
    assert.equal(
      raceWinnerSelfRow.display_name,
      raceWinnerAccount.displayName,
      "race winner still sees own real display name in anonymous mode",
    );
    assert.notEqual(
      raceWinnerSelfRow.row_id,
      raceWinnerMembershipId,
      "race winner self row_id stays opaque while anonymity is enabled",
    );
    assertAnonymousAlias(raceWinnerBoardAfterRace.own_alias, "race winner own_alias");

    const ownerBoardAfterRace = await rpcExpectOk(owner.token, "get_group_leaderboard", {
      p_group_id: groupId,
      p_period: "all_time",
    });
    assertLeaderboardCardinality(ownerBoardAfterRace, 3, "owner anonymous leaderboard after max_uses race");
    const ownerSelfAfterRace = getSelfLeaderboardRow(ownerBoardAfterRace);
    assert.equal(
      ownerSelfAfterRace.display_name,
      owner.displayName,
      "owner still sees own real display name after race while anonymity stays enabled",
    );
    const raceWinnerAliasAsSeenByOwner = ownerBoardAfterRace.items.find(
      (item) => item.display_name === raceWinnerBoardAfterRace.own_alias,
    );
    assert.ok(raceWinnerAliasAsSeenByOwner, "owner board should include the race winner alias row");
    assert.equal(
      raceWinnerAliasAsSeenByOwner.is_self,
      false,
      "race winner alias row should be foreign for owner",
    );
    assert.ok(
      typeof raceWinnerAliasAsSeenByOwner.row_id === "string" && raceWinnerAliasAsSeenByOwner.row_id.length > 0,
      "race winner alias row should expose a non-null opaque row_id",
    );
    assert.notEqual(
      raceWinnerAliasAsSeenByOwner.row_id,
      raceWinnerMembershipId,
      "race winner alias row_id should not reveal stable membership id",
    );
    assertAnonymousAlias(raceWinnerAliasAsSeenByOwner.display_name, "race winner alias as seen by owner");

    const ownerGroupsAfterRace = await rpcExpectOk(owner.token, "list_my_groups");
    assert.equal(ownerGroupsAfterRace.items.length, 1, "owner should still have exactly one active group summary");
    assert.equal(
      ownerGroupsAfterRace.items[0].member_count,
      "3",
      "list_my_groups member_count stays consistent after race winner joins",
    );
  },
);
