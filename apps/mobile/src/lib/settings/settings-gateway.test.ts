import { describe, expect, it, vi } from "vitest";
import type { Database } from "@salawat-circle/shared-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseSettingsGateway } from "./settings-gateway";

describe("Supabase settings gateway", () => {
  it("loads only the current user's display name and timezone", async () => {
    const profilesSingle = vi.fn(async () => ({
      data: { display_name: "Amina Example" },
      error: null,
    }));
    const settingsSingle = vi.fn(async () => ({
      data: { timezone: "Europe/Berlin" },
      error: null,
    }));
    const client = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          single: table === "profiles" ? profilesSingle : settingsSingle,
        })),
      })),
    } as unknown as SupabaseClient<Database>;
    const gateway = createSupabaseSettingsGateway(client);

    await expect(gateway.loadProfile()).resolves.toEqual({
      displayName: "Amina Example",
      timeZone: "Europe/Berlin",
    });
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.from).toHaveBeenCalledWith("user_settings");
  });
});
