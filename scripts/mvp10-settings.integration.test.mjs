import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

async function signIn() {
  const email = `mvp10-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const requested = await fetch(`${apiUrl}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: true }),
  });
  assert.equal(requested.ok, true, "OTP request should succeed");
  const verified = await fetch(`${apiUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, token: await findOtp(email), type: "email" }),
  });
  assert.equal(verified.ok, true, "OTP verification should succeed");
  return (await verified.json()).access_token;
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
  return { response, payload: await response.json() };
}

test("MVP10 profile settings update name and timezone idempotently", async () => {
  const token = await signIn();
  const first = await rpc(token, "upsert_my_profile", {
    p_display_name: "MVP Ten",
    p_timezone: "Europe/Berlin",
    p_locale: "en",
  });
  assert.equal(first.response.ok, true);
  assert.equal(first.payload.profile_complete, true);

  const duplicate = await rpc(token, "upsert_my_profile", {
    p_display_name: "MVP Ten",
    p_timezone: "Europe/Berlin",
    p_locale: "en",
  });
  assert.equal(duplicate.response.ok, true);
  assert.equal(duplicate.payload.profile_complete, true);

  const invalid = await rpc(token, "upsert_my_profile", {
    p_display_name: "MVP Ten",
    p_timezone: "Invalid/Zone",
    p_locale: "en",
  });
  assert.equal(invalid.response.ok, false);
  assert.equal(invalid.payload.message, "INVALID_TIMEZONE");
});
