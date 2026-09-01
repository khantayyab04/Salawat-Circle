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
    const messages = await (
      await fetch("http://127.0.0.1:54324/api/v1/messages")
    ).json();
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

test("MVP06 goal RPC sets, replaces, and deactivates today's goal", async () => {
  const email = `mvp06-${Date.now()}@example.test`;
  assert.equal((await requestOtp(email)).ok, true);
  const otp = await findOtp(email);
  const verified = await fetch(`${apiUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, token: otp, type: "email" }),
  });
  assert.equal(verified.ok, true);
  const { access_token: token } = await verified.json();

  assert.equal(
    (
      await rpc(token, "upsert_my_profile", {
        p_display_name: "MVP Six",
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

  const today = new Date().toISOString().slice(0, 10);
  assert.equal(
    (
      await rpc(token, "set_daily_goal", {
        p_effective_from: today,
        p_amount: 100,
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await rpc(token, "set_daily_goal", {
        p_effective_from: today,
        p_amount: 250,
      })
    ).ok,
    true,
  );
  const activeSummary = await rpc(token, "get_home_summary", {
    p_timezone: "UTC",
  });
  assert.equal(activeSummary.ok, true);
  const active = await activeSummary.json();
  assert.equal(active.today_goal, "250");
  assert.equal(active.eligible_goal_days, "1");
  assert.equal(active.achieved_days, "0");

  assert.equal(
    (
      await rpc(token, "set_daily_goal", {
        p_effective_from: today,
        p_amount: null,
      })
    ).ok,
    true,
  );
  const inactiveSummary = await rpc(token, "get_home_summary", {
    p_timezone: "UTC",
  });
  assert.equal(inactiveSummary.ok, true);
  const inactive = await inactiveSummary.json();
  assert.equal(inactive.today_goal, null);
  assert.equal(inactive.eligible_goal_days, "0");
});
