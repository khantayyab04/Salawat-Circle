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

assert.ok(apiUrl, "Local Supabase API is not running");
assert.ok(publicKey, "Local Supabase public key is unavailable");

async function requestOtp(email) {
  return fetch(`${apiUrl}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: true }),
  });
}

async function findOtp(email) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const response = await fetch("http://127.0.0.1:54324/api/v1/messages");
    const messages = await response.json();
    const message = messages.messages?.find((candidate) =>
      candidate.To?.some((recipient) => recipient.Address === email),
    );
    if (message) {
      const detail = await (
        await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`)
      ).json();
      const otp = JSON.stringify(detail).match(/\b\d{6}\b/u)?.[0];
      if (otp) return otp;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("No six-digit OTP arrived in Mailpit");
}

async function signIn() {
  const email = `mvp07-${Date.now()}@example.test`;
  assert.equal((await requestOtp(email)).ok, true);
  const otp = await findOtp(email);
  const response = await fetch(`${apiUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, token: otp, type: "email" }),
  });
  assert.equal(response.ok, true);
  const session = await response.json();
  return session.access_token;
}

async function rpc(token, name, body) {
  return fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publicKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

test("MVP07 offline sync RPC contract is idempotent and conflict-safe", async () => {
  const token = await signIn();
  assert.equal(
    (
      await rpc(token, "upsert_my_profile", {
        p_display_name: "MVP Seven",
        p_timezone: "UTC",
        p_locale: "en",
      })
    ).ok,
    true,
  );
  assert.equal(
    (await rpc(token, "grant_core_consent", { p_locale: "en" })).ok,
    true,
  );

  const id = randomUUID();
  const entryDate = new Date().toISOString().slice(0, 10);
  const input = {
    p_id: id,
    p_amount: 70,
    p_entry_date: entryDate,
    p_timezone: "UTC",
    p_recorded_at_client: new Date().toISOString(),
  };

  const created = await rpc(token, "create_entry", input);
  assert.equal(created.ok, true);
  const createdEntry = (await created.json()).entry;
  assert.equal(createdEntry.id, id);
  assert.equal(createdEntry.revision, 1);

  const repeatedCreate = await rpc(token, "create_entry", input);
  assert.equal(repeatedCreate.ok, true);
  assert.deepEqual((await repeatedCreate.json()).entry, createdEntry);

  const staleUpdate = await rpc(token, "update_entry", {
    p_id: id,
    p_amount: 71,
    p_entry_date: entryDate,
    p_expected_revision: createdEntry.revision + 1,
  });
  assert.equal(staleUpdate.status, 400);
  assert.equal((await staleUpdate.json()).message, "ENTRY_VERSION_CONFLICT");

  const serverState = await rpc(token, "get_entry", { p_id: id });
  assert.equal(serverState.ok, true);
  const serverEntry = (await serverState.json()).entry;
  assert.equal(serverEntry.id, id);
  assert.equal(serverEntry.amount, "70");
  assert.equal(serverEntry.revision, createdEntry.revision);

  const deleted = await rpc(token, "delete_entry", {
    p_id: id,
    p_expected_revision: serverEntry.revision,
  });
  assert.equal(deleted.ok, true);
  assert.equal((await deleted.json()).deleted, true);

  const repeatedDelete = await rpc(token, "delete_entry", {
    p_id: id,
    p_expected_revision: serverEntry.revision,
  });
  assert.equal(repeatedDelete.ok, true);
  assert.equal((await repeatedDelete.json()).deleted, true);
});
