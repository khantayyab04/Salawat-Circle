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
  const email = `mvp05-${Date.now()}@example.test`;
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
  const response = await fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publicKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response;
}

test("MVP05 entry RPCs create, page, detect a conflict, and delete idempotently", async () => {
  const token = await signIn();
  assert.equal(
    (
      await rpc(token, "upsert_my_profile", {
        p_display_name: "MVP Five",
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

  const date = new Date().toISOString().slice(0, 10);
  const firstId = randomUUID();
  const secondId = randomUUID();
  const recordedAt = new Date().toISOString();
  const firstInput = {
    p_id: firstId,
    p_amount: 10,
    p_entry_date: date,
    p_timezone: "UTC",
    p_recorded_at_client: recordedAt,
  };
  const created = await rpc(token, "create_entry", firstInput);
  assert.equal(created.ok, true);
  const firstEntry = (await created.json()).entry;
  assert.equal(firstEntry.amount, "10");

  const repeated = await rpc(token, "create_entry", firstInput);
  assert.equal(repeated.ok, true);
  assert.equal((await repeated.json()).entry.id, firstId);

  assert.equal(
    (
      await rpc(token, "create_entry", {
        ...firstInput,
        p_id: secondId,
        p_amount: 20,
        p_recorded_at_client: new Date(Date.now() + 1).toISOString(),
      })
    ).ok,
    true,
  );

  const pageOne = await rpc(token, "list_entries", { p_limit: 1 });
  assert.equal(pageOne.ok, true);
  const firstPage = await pageOne.json();
  const pageTwo = await rpc(token, "list_entries", {
    p_cursor_entry_date: firstPage.next_cursor.entry_date,
    p_cursor_created_at: firstPage.next_cursor.created_at,
    p_cursor_id: firstPage.next_cursor.id,
    p_limit: 1,
  });
  assert.equal(pageTwo.ok, true);
  const secondPage = await pageTwo.json();
  assert.notEqual(firstPage.items[0].id, secondPage.items[0].id);

  const conflict = await rpc(token, "update_entry", {
    p_id: firstId,
    p_amount: 11,
    p_entry_date: date,
    p_expected_revision: firstEntry.revision + 1,
  });
  assert.equal(conflict.ok, false);
  assert.equal((await conflict.json()).message, "ENTRY_VERSION_CONFLICT");

  assert.equal(
    (
      await rpc(token, "delete_entry", {
        p_id: firstId,
        p_expected_revision: firstEntry.revision,
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await rpc(token, "delete_entry", {
        p_id: firstId,
        p_expected_revision: firstEntry.revision,
      })
    ).ok,
    true,
  );
});
