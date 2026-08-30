import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Database Migration 20260830000000_personal_core.sql", () => {
  const migrationPath = path.resolve(
    __dirname,
    "../../../../supabase/migrations/20260830000000_personal_core.sql",
  );

  it("exists and is readable", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("defines all core tables with RLS and SECURITY DEFINER RPCs", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");

    // Check table definitions
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.profiles");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.user_settings");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.salawat_entries");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.daily_goal_versions");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.app_config");

    // Check RLS
    expect(sql).toContain("ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.salawat_entries ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE public.salawat_entries FORCE ROW LEVEL SECURITY;");

    // Check direct mutation revocation
    expect(sql).toContain("REVOKE INSERT, UPDATE, DELETE ON public.salawat_entries FROM anon, authenticated;");

    // Check RPC functions
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.get_home_summary");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.list_entries");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.create_entry");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.update_entry");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.delete_entry");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.set_daily_goal");
  });
});
