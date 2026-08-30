import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const mobileRoot = new URL("../apps/mobile/", import.meta.url);

function readExpoConfig(platform) {
  const result = spawnSync(
    "./node_modules/.bin/expo",
    [
      "config",
      "--type",
      "public",
      "--json",
    ],
    {
      cwd: mobileRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "true",
        EXPO_NO_TELEMETRY: "1",
        EXPO_OS: platform,
      },
    },
  );

  assert.equal(
    result.status,
    0,
    `Expo-Konfiguration für ${platform} ist nicht auflösbar:\n${result.stderr || result.stdout}`,
  );
  assert.match(
    result.stdout,
    /^\s*\{/,
    `Expo-Konfiguration für ${platform} fehlt:\n${result.stdout}`,
  );

  return JSON.parse(result.stdout);
}

test("the managed app resolves an iOS development configuration", () => {
  const config = readExpoConfig("ios");

  assert.equal(config.name, "Salawat Circle");
  assert.equal(config.ios.bundleIdentifier, "de.salawatcircle.app");
});

test("the managed app resolves an Android development configuration", () => {
  const config = readExpoConfig("android");

  assert.equal(config.name, "Salawat Circle");
  assert.equal(config.android.package, "de.salawatcircle.app");
});
