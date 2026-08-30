-- Migration 20260830000000_personal_core.sql
-- Personal Core Schema, RLS, Triggers and RPC Functions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 30),
  normalized_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- 2. User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'de',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY settings_select_own ON public.user_settings
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY settings_update_own ON public.user_settings
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. Salawat Entries Table
CREATE TABLE IF NOT EXISTS public.salawat_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount BETWEEN 1 AND 10000000),
  entry_date DATE NOT NULL,
  timezone TEXT NOT NULL,
  recorded_at_client TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1)
);

ALTER TABLE public.salawat_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salawat_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY entries_select_own ON public.salawat_entries
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Revoke direct mutations from client role; mutations go through RPCs
REVOKE INSERT, UPDATE, DELETE ON public.salawat_entries FROM anon, authenticated;

-- Indexes for salawat_entries
CREATE INDEX IF NOT EXISTS idx_salawat_entries_user_date_created_id
  ON public.salawat_entries (user_id, entry_date DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_salawat_entries_user_updated
  ON public.salawat_entries (user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_salawat_entries_user_entry_date
  ON public.salawat_entries (user_id, entry_date);

-- 4. Daily Goal Versions Table
CREATE TABLE IF NOT EXISTS public.daily_goal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  amount INTEGER NULL CHECK (amount IS NULL OR (amount BETWEEN 1 AND 10000000)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_daily_goal_user_effective UNIQUE (user_id, effective_from)
);

ALTER TABLE public.daily_goal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goal_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY goals_select_own ON public.daily_goal_versions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.daily_goal_versions FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_daily_goal_user_effective
  ON public.daily_goal_versions (user_id, effective_from DESC);

-- 5. App Config Table
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config FORCE ROW LEVEL SECURITY;

CREATE POLICY app_config_select ON public.app_config
  FOR SELECT TO authenticated, anon
  USING (true);

-- Insert initial app config
INSERT INTO public.app_config (key, value) VALUES
  ('min_app_version', '{"ios": "1.0.0", "android": "1.0.0"}'::jsonb),
  ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6. Trigger on auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_name TEXT;
BEGIN
  default_name := COALESCE(NEW.raw_user_meta_data->>'display_name', 'Nutzer');
  IF char_length(default_name) < 2 OR char_length(default_name) > 30 THEN
    default_name := 'Nutzer';
  END IF;

  INSERT INTO public.profiles (id, display_name, normalized_name)
  VALUES (
    NEW.id,
    default_name,
    lower(trim(default_name))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id, timezone, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'de')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions for authenticated users to execute RPCs
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 7. RPC: get_home_summary
CREATE OR REPLACE FUNCTION public.get_home_summary(p_timezone TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_tz TEXT;
  v_today DATE;
  v_week_start DATE;
  v_week_end DATE;
  v_today_total BIGINT;
  v_week_total BIGINT;
  v_all_time_total BIGINT;
  v_today_goal INTEGER;
  v_achieved_days INTEGER := 0;
  v_eligible_goal_days INTEGER := 0;
  v_curr_date DATE;
  v_curr_goal INTEGER;
  v_curr_total BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  -- Determine timezone
  IF p_timezone IS NOT NULL AND p_timezone <> '' THEN
    v_tz := p_timezone;
  ELSE
    SELECT timezone INTO v_tz FROM public.user_settings WHERE user_id = v_user_id;
    IF v_tz IS NULL THEN
      v_tz := 'UTC';
    END IF;
  END IF;

  -- Compute current date in user's timezone
  v_today := (now() AT TIME ZONE v_tz)::date;

  -- Monday of current week (ISO week: Monday = 1, Sunday = 7)
  v_week_start := v_today - (EXTRACT(ISODOW FROM v_today)::integer - 1);
  v_week_end := v_week_start + 6;

  -- Today's total
  SELECT COALESCE(SUM(amount), 0)
    INTO v_today_total
    FROM public.salawat_entries
   WHERE user_id = v_user_id AND entry_date = v_today;

  -- Week's total (Monday to Sunday)
  SELECT COALESCE(SUM(amount), 0)
    INTO v_week_total
    FROM public.salawat_entries
   WHERE user_id = v_user_id AND entry_date BETWEEN v_week_start AND v_week_end;

  -- All time total
  SELECT COALESCE(SUM(amount), 0)
    INTO v_all_time_total
    FROM public.salawat_entries
   WHERE user_id = v_user_id;

  -- Effective goal for today
  SELECT amount INTO v_today_goal
    FROM public.daily_goal_versions
   WHERE user_id = v_user_id AND effective_from <= v_today
   ORDER BY effective_from DESC
   LIMIT 1;

  -- Compute goal days statistics from Monday (v_week_start) up to today (v_today)
  v_curr_date := v_week_start;
  WHILE v_curr_date <= v_today LOOP
    SELECT amount INTO v_curr_goal
      FROM public.daily_goal_versions
     WHERE user_id = v_user_id AND effective_from <= v_curr_date
     ORDER BY effective_from DESC
     LIMIT 1;

    IF v_curr_goal IS NOT NULL AND v_curr_goal > 0 THEN
      v_eligible_goal_days := v_eligible_goal_days + 1;

      SELECT COALESCE(SUM(amount), 0) INTO v_curr_total
        FROM public.salawat_entries
       WHERE user_id = v_user_id AND entry_date = v_curr_date;

      IF v_curr_total >= v_curr_goal THEN
        v_achieved_days := v_achieved_days + 1;
      END IF;
    END IF;

    v_curr_date := v_curr_date + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'today_date', v_today,
    'today_total', v_today_total::text,
    'week_start', v_week_start,
    'week_total', v_week_total::text,
    'all_time_total', v_all_time_total::text,
    'today_goal', v_today_goal,
    'achieved_days', v_achieved_days,
    'eligible_goal_days', v_eligible_goal_days,
    'calculated_at', now()
  );
END;
$$;

-- 8. RPC: list_entries
CREATE OR REPLACE FUNCTION public.list_entries(
  p_cursor_date DATE DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_effective_limit INTEGER;
  v_rows JSONB;
  v_has_more BOOLEAN := false;
  v_next_cursor JSONB := NULL;
  v_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  v_effective_limit := LEAST(GREATEST(p_limit, 1), 50);

  WITH filtered AS (
    SELECT id, amount, entry_date, timezone, recorded_at_client, created_at, updated_at, revision
      FROM public.salawat_entries
     WHERE user_id = v_user_id
       AND (
         p_cursor_date IS NULL OR
         (entry_date, created_at, id) < (p_cursor_date, p_cursor_created_at, p_cursor_id)
       )
     ORDER BY entry_date DESC, created_at DESC, id DESC
     LIMIT (v_effective_limit + 1)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'amount', amount,
      'entry_date', entry_date,
      'timezone', timezone,
      'recorded_at_client', recorded_at_client,
      'created_at', created_at,
      'updated_at', updated_at,
      'revision', revision
    )
  ) INTO v_rows FROM filtered;

  v_count := jsonb_array_length(COALESCE(v_rows, '[]'::jsonb));

  IF v_count > v_effective_limit THEN
    v_has_more := true;
    -- Build next_cursor from item at index v_effective_limit - 1
    v_next_cursor := jsonb_build_object(
      'entry_date', v_rows->(v_effective_limit - 1)->>'entry_date',
      'created_at', v_rows->(v_effective_limit - 1)->>'created_at',
      'id', v_rows->(v_effective_limit - 1)->>'id'
    );
    -- Trim row list to limit
    SELECT jsonb_agg(elem) INTO v_rows
      FROM jsonb_array_elements(v_rows) WITH ORDINALITY AS t(elem, ord)
     WHERE ord <= v_effective_limit;
  END IF;

  RETURN jsonb_build_object(
    'items', COALESCE(v_rows, '[]'::jsonb),
    'next_cursor', v_next_cursor,
    'has_more', v_has_more
  );
END;
$$;

-- 9. RPC: create_entry
CREATE OR REPLACE FUNCTION public.create_entry(
  p_id UUID,
  p_amount INTEGER,
  p_entry_date DATE,
  p_timezone TEXT,
  p_recorded_at_client TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_existing public.salawat_entries%ROWTYPE;
  v_inserted public.salawat_entries%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_amount < 1 OR p_amount > 10000000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0002';
  END IF;

  -- Check existing entry by ID
  SELECT * INTO v_existing FROM public.salawat_entries WHERE id = p_id;
  IF FOUND THEN
    IF v_existing.user_id = v_user_id THEN
      -- Idempotent return if content matches
      IF v_existing.amount = p_amount AND v_existing.entry_date = p_entry_date THEN
        RETURN jsonb_build_object(
          'id', v_existing.id,
          'amount', v_existing.amount,
          'entry_date', v_existing.entry_date,
          'timezone', v_existing.timezone,
          'recorded_at_client', v_existing.recorded_at_client,
          'created_at', v_existing.created_at,
          'updated_at', v_existing.updated_at,
          'revision', v_existing.revision
        );
      ELSE
        RAISE EXCEPTION 'ENTRY_VERSION_CONFLICT' USING ERRCODE = 'P0003';
      END IF;
    ELSE
      RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0004';
    END IF;
  END IF;

  INSERT INTO public.salawat_entries (
    id, user_id, amount, entry_date, timezone, recorded_at_client
  ) VALUES (
    p_id, v_user_id, p_amount, p_entry_date, p_timezone, p_recorded_at_client
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'id', v_inserted.id,
    'amount', v_inserted.amount,
    'entry_date', v_inserted.entry_date,
    'timezone', v_inserted.timezone,
    'recorded_at_client', v_inserted.recorded_at_client,
    'created_at', v_inserted.created_at,
    'updated_at', v_inserted.updated_at,
    'revision', v_inserted.revision
  );
END;
$$;

-- 10. RPC: update_entry
CREATE OR REPLACE FUNCTION public.update_entry(
  p_id UUID,
  p_amount INTEGER,
  p_entry_date DATE,
  p_expected_revision INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_existing public.salawat_entries%ROWTYPE;
  v_updated public.salawat_entries%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_amount < 1 OR p_amount > 10000000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_existing FROM public.salawat_entries WHERE id = p_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0005';
  END IF;

  IF v_existing.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'ENTRY_VERSION_CONFLICT' USING ERRCODE = 'P0003';
  END IF;

  UPDATE public.salawat_entries
     SET amount = p_amount,
         entry_date = p_entry_date,
         revision = revision + 1,
         updated_at = now()
   WHERE id = p_id AND user_id = v_user_id
  RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'amount', v_updated.amount,
    'entry_date', v_updated.entry_date,
    'timezone', v_updated.timezone,
    'recorded_at_client', v_updated.recorded_at_client,
    'created_at', v_updated.created_at,
    'updated_at', v_updated.updated_at,
    'revision', v_updated.revision
  );
END;
$$;

-- 11. RPC: delete_entry
CREATE OR REPLACE FUNCTION public.delete_entry(
  p_id UUID,
  p_expected_revision INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_existing public.salawat_entries%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_existing FROM public.salawat_entries WHERE id = p_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    -- Idempotent success if already deleted
    RETURN jsonb_build_object('deleted', true);
  END IF;

  IF p_expected_revision IS NOT NULL AND v_existing.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'ENTRY_VERSION_CONFLICT' USING ERRCODE = 'P0003';
  END IF;

  DELETE FROM public.salawat_entries WHERE id = p_id AND user_id = v_user_id;

  RETURN jsonb_build_object('deleted', true);
END;
$$;

-- 12. RPC: set_daily_goal
CREATE OR REPLACE FUNCTION public.set_daily_goal(
  p_effective_from DATE,
  p_amount INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_goal public.daily_goal_versions%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_amount IS NOT NULL AND (p_amount < 1 OR p_amount > 10000000) THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.daily_goal_versions (user_id, effective_from, amount)
  VALUES (v_user_id, p_effective_from, p_amount)
  ON CONFLICT (user_id, effective_from)
  DO UPDATE SET amount = EXCLUDED.amount, updated_at = now()
  RETURNING * INTO v_goal;

  RETURN jsonb_build_object(
    'id', v_goal.id,
    'effective_from', v_goal.effective_from,
    'amount', v_goal.amount,
    'created_at', v_goal.created_at,
    'updated_at', v_goal.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_home_summary(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_entries(DATE, TIMESTAMPTZ, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_entry(UUID, INTEGER, DATE, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_entry(UUID, INTEGER, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entry(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_daily_goal(DATE, INTEGER) TO authenticated;
