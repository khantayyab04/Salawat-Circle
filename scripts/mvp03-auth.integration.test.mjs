import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const statusOutput = execFileSync(
  "pnpm",
  ["exec", "supabase", "status", "-o", "env"],
  { encoding: "utf8" },
);
const localEnvironment = Object.fromEntries(
  statusOutput
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/u))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
const apiUrl = localEnvironment.API_URL;
const publicKey =
  localEnvironment.PUBLISHABLE_KEY ?? localEnvironment.ANON_KEY;
const mailpitUrl = "http://127.0.0.1:54324";

assert.ok(apiUrl, "Local Supabase API is not running");
assert.ok(publicKey, "Local Supabase public key is unavailable");

test("local OTP policy is six digits, ten minutes, and one request per minute", () => {
  const config = readFileSync("supabase/config.toml", "utf8");
  assert.match(config, /otp_length = 6/u);
  assert.match(config, /otp_expiry = 600/u);
  assert.match(config, /max_frequency = "1m"/u);
});

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

async function findOtp(email) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const listResponse = await fetch(`${mailpitUrl}/api/v1/messages`);
    assert.equal(listResponse.ok, true, "Mailpit list endpoint failed");
    const list = await listResponse.json();
    const message = list.messages?.find((candidate) =>
      candidate.To?.some((recipient) => recipient.Address === email),
    );
    if (message) {
      const detailResponse = await fetch(
        `${mailpitUrl}/api/v1/message/${message.ID}`,
      );
      assert.equal(detailResponse.ok, true, "Mailpit message endpoint failed");
      const detail = await detailResponse.json();
      const otp = JSON.stringify(detail).match(/\b\d{6}\b/u)?.[0];
      if (otp) return otp;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("No six-digit OTP arrived in Mailpit");
}

test("local email OTP signs in once and rejects invalid or reused codes", async () => {
  const email = `mvp03-${Date.now()}@example.test`;
  const request = await authRequest("otp", { email, create_user: true });
  assert.equal(request.ok, true, "OTP request should return a neutral success");

  const otp = await findOtp(email);
  const invalid = await authRequest("verify", {
    email,
    token: "000000",
    type: "email",
  });
  assert.equal(invalid.ok, false, "A false OTP must not create a session");

  const valid = await authRequest("verify", { email, token: otp, type: "email" });
  assert.equal(valid.ok, true, "The delivered OTP should create a session");
  const session = await valid.json();
  assert.ok(session.access_token, "A successful verification returns a session");

  const reused = await authRequest("verify", { email, token: otp, type: "email" });
  assert.equal(reused.ok, false, "A consumed OTP must not be reusable");
});
