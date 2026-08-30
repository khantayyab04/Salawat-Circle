import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkBackendHealth,
  checkConfiguredBackend,
  resolveBackendConfig,
} from "./backend";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveBackendConfig", () => {
  it("uses the Android emulator URL on Android", () => {
    expect(
      resolveBackendConfig(
        {
          EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-local-key",
          EXPO_PUBLIC_SUPABASE_URL_ANDROID: "http://10.0.2.2:54321",
          EXPO_PUBLIC_SUPABASE_URL_IOS: "http://127.0.0.1:54321",
        },
        "android",
      ),
    ).toEqual({
      anonKey: "public-local-key",
      url: "http://10.0.2.2:54321",
    });
  });

  it("rejects an incomplete public backend configuration", () => {
    expect(() => resolveBackendConfig({}, "ios")).toThrow(
      "Backend-Konfiguration fehlt.",
    );
  });

  it("rejects the example key before making a request", () => {
    expect(() =>
      resolveBackendConfig(
        {
          EXPO_PUBLIC_SUPABASE_ANON_KEY: "replace-with-local-publishable-key",
          EXPO_PUBLIC_SUPABASE_URL_IOS: "http://127.0.0.1:54321",
        },
        "ios",
      ),
    ).toThrow("Backend-Konfiguration fehlt.");
  });
});

describe("checkBackendHealth", () => {
  it("reaches the Supabase REST endpoint with the public key", async () => {
    let resolveRequest: (request: {
      apiKey?: string;
      authorization?: string;
      path?: string;
    }) => void;
    const request = new Promise<{
      apiKey?: string;
      authorization?: string;
      path?: string;
    }>((resolve) => {
      resolveRequest = resolve;
    });
    const server = createServer((incoming, response) => {
      resolveRequest({
        apiKey: incoming.headers.apikey as string | undefined,
        authorization: incoming.headers.authorization,
        path: incoming.url,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}");
    });

    try {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const { port } = server.address() as AddressInfo;

      await checkBackendHealth({
        anonKey: "public-local-key",
        url: `http://127.0.0.1:${port}`,
      });

      await expect(request).resolves.toEqual({
        apiKey: "public-local-key",
        authorization: "Bearer public-local-key",
        path: "/rest/v1/",
      });
    } finally {
      server.close();
    }
  });

  it("reports an unavailable backend without exposing configuration", async () => {
    const server = createServer((_incoming, response) => {
      response.writeHead(503);
      response.end();
    });

    try {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const { port } = server.address() as AddressInfo;

      await expect(
        checkBackendHealth({
          anonKey: "must-not-appear",
          url: `http://127.0.0.1:${port}`,
        }),
      ).rejects.toThrow("Backend ist nicht erreichbar.");
    } finally {
      server.close();
    }
  });
});

describe("checkConfiguredBackend", () => {
  it("rejects missing configuration through its promise contract", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL_ANDROID", "");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL_IOS", "");

    await expect(checkConfiguredBackend()).rejects.toThrow(
      "Backend-Konfiguration fehlt.",
    );
  });
});
