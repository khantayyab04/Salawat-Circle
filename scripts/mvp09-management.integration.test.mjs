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

assert.ok(apiUrl, "Local Supabase API is not running");
assert.ok(publicKey, "Local Supabase public key is unavailable");

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
  const text = await response.text();
  return { response, payload: text ? JSON.parse(text) : null };
}

async function rpcOk(token, name, body = {}) {
  const { response, payload } = await rpc(token, name, body);
  assert.equal(response.ok, true, `${name} should succeed`);
  return payload;
}

async function findOtp(email) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const list = await (await fetch(`${mailpitUrl}/api/v1/messages`)).json();
    const message = list.messages?.find((candidate) =>
      candidate.To?.some((recipient) => recipient.Address === email),
    );
    if (message) {
      const detail = await (
        await fetch(`${mailpitUrl}/api/v1/message/${message.ID}`)
      ).json();
      const otp = JSON.stringify(detail).match(/\b\d{6}\b/u)?.[0];
      if (otp) return otp;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("No six-digit OTP arrived in Mailpit");
}

async function signIn(name) {
  const email = `mvp09-${name.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const otpRequest = await fetch(`${apiUrl}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: true }),
  });
  assert.equal(otpRequest.ok, true, "OTP request should succeed");
  const otp = await findOtp(email);
  const verified = await fetch(`${apiUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, token: otp, type: "email" }),
  });
  assert.equal(verified.ok, true, "OTP verification should succeed");
  const session = await verified.json();
  await rpcOk(session.access_token, "upsert_my_profile", {
    p_display_name: `Mvp09 ${name}`,
    p_timezone: "Europe/Berlin",
    p_locale: "en",
  });
  await rpcOk(session.access_token, "grant_core_consent", { p_locale: "en" });
  return session.access_token;
}

test("MVP09 manages private group ownership without exposing personal entries", async () => {
  const owner = await signIn("Owner");
  const removableMember = await signIn("Member");
  const successor = await signIn("Successor");
  const groupId = randomUUID();
  const created = await rpcOk(owner, "create_group", {
    p_client_group_id: groupId,
    p_name: "MVP09 Integration Circle",
    p_timezone: "Europe/Berlin",
    p_leaderboard_anonymous: false,
    p_rules_accepted: true,
  });
  const invite = await rpcOk(owner, "create_group_invite", {
    p_group_id: groupId,
    p_expires_in_days: 7,
    p_max_uses: 2,
  });

  const acceptedMember = await rpcOk(removableMember, "accept_group_invite", {
    p_kind: "token",
    p_secret: invite.invite.token,
    p_locale: "en",
  });
  const acceptedSuccessor = await rpcOk(successor, "accept_group_invite", {
    p_kind: "token",
    p_secret: invite.invite.token,
    p_locale: "en",
  });
  assert.equal(acceptedMember.already_active, false);
  assert.equal(acceptedSuccessor.already_active, false);

  await rpcOk(successor, "create_entry", {
    p_id: randomUUID(),
    p_amount: 100,
    p_entry_date: new Date().toISOString().slice(0, 10),
    p_timezone: "Europe/Berlin",
    p_recorded_at_client: new Date().toISOString(),
  });

  const anonymous = await rpcOk(owner, "set_group_leaderboard_anonymity", {
    p_group_id: groupId,
    p_anonymous: true,
    p_expected_revision: created.group.revision,
  });
  const members = await rpcOk(owner, "list_group_members", {
    p_group_id: groupId,
    p_limit: 30,
  });
  assert.equal(members.items.length, 3);
  assert.equal(
    members.items.find((member) => member.is_self)?.display_name,
    "Mvp09 Owner",
  );
  assert.equal(
    members.items.some((member) => member.display_name === "Mvp09 Member"),
    false,
    "an alias group must not expose another member display name",
  );

  const removed = await rpcOk(owner, "remove_group_member", {
    p_group_id: groupId,
    p_membership_id: acceptedMember.membership.id,
    p_expected_revision: anonymous.group.revision,
  });
  const removedList = await rpc(removableMember, "list_group_members", {
    p_group_id: groupId,
    p_limit: 30,
  });
  assert.equal(removedList.response.ok, false);
  assert.equal(removedList.payload?.message, "NOT_FOUND");

  const transferred = await rpcOk(owner, "transfer_group_ownership", {
    p_group_id: groupId,
    p_membership_id: acceptedSuccessor.membership.id,
    p_expected_revision: removed.group.revision,
  });
  await rpcOk(owner, "leave_group", { p_group_id: groupId });
  await rpcOk(successor, "delete_group", {
    p_group_id: groupId,
    p_expected_revision: transferred.group.revision,
  });

  const ownEntries = await rpcOk(successor, "list_entries", { p_limit: 20 });
  assert.equal(
    ownEntries.items.some((entry) => entry.amount === "100"),
    true,
    "deleting a group must not delete the successor's personal salawat entry",
  );
});
