begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

-- Owner of the series under test.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-4333-8333-333333333331',
  'authenticated',
  'authenticated',
  'mvp12-series-owner@example.test',
  '',
  now(),
  now(),
  now()
), (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-4333-8333-333333333332',
  'authenticated',
  'authenticated',
  'mvp12-series-other@example.test',
  '',
  now(),
  now(),
  now()
);

insert into public.profiles (id, display_name, normalized_name)
values
  ('33333333-3333-4333-8333-333333333331', 'Series Owner', 'series owner'),
  ('33333333-3333-4333-8333-333333333332', 'Series Other', 'series other');

insert into public.user_settings (user_id, timezone, locale)
values
  ('33333333-3333-4333-8333-333333333331', 'UTC', 'en'),
  ('33333333-3333-4333-8333-333333333332', 'UTC', 'en');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('33333333-3333-4333-8333-333333333331', 'core_processing', 'mvp-core-v1', 'en'),
  ('33333333-3333-4333-8333-333333333332', 'core_processing', 'mvp-core-v1', 'en');

-- Owner: today 500, yesterday 300, and one entry two years back so the
-- all-time range has more than a single bucket to aggregate.
insert into public.salawat_entries (
  id, user_id, amount, entry_date, timezone, recorded_at_client
) values
  ('33333333-3333-4333-8333-33333333aaa1', '33333333-3333-4333-8333-333333333331', 500,
   (now() at time zone 'UTC')::date, 'UTC', now()),
  ('33333333-3333-4333-8333-33333333aaa2', '33333333-3333-4333-8333-333333333331', 300,
   (now() at time zone 'UTC')::date - 1, 'UTC', now()),
  ('33333333-3333-4333-8333-33333333aaa3', '33333333-3333-4333-8333-333333333331', 700,
   (now() at time zone 'UTC')::date - 400, 'UTC', now());

-- Another member's data must never leak into the series.
insert into public.salawat_entries (
  id, user_id, amount, entry_date, timezone, recorded_at_client
) values
  ('33333333-3333-4333-8333-33333333bbb1', '33333333-3333-4333-8333-333333333332', 9999,
   (now() at time zone 'UTC')::date, 'UTC', now());

insert into public.daily_goal_versions (user_id, effective_from, amount)
values ('33333333-3333-4333-8333-333333333331',
        (now() at time zone 'UTC')::date - 10, 400);

set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333331';
set local "request.jwt.claim.role" = 'authenticated';

-- Range shape ---------------------------------------------------------------

select is(
  jsonb_array_length(public.get_progress_series('UTC', 'week')->'buckets'),
  7,
  'the week range is reported as seven day buckets'
);

select ok(
  jsonb_array_length(public.get_progress_series('UTC', 'month')->'buckets') between 4 and 6,
  'the month range spans the whole month as weekly buckets'
);

select is(
  jsonb_array_length(public.get_progress_series('UTC', 'year')->'buckets'),
  12,
  'the year range always spans twelve monthly buckets'
);

select ok(
  (
    select bool_or((bucket->>'future')::boolean)
    from jsonb_array_elements(
      public.get_progress_series('UTC', 'year')->'buckets'
    ) as bucket
    where (bucket->>'start')::date > (now() at time zone 'UTC')::date
  ) is not false,
  'buckets after today are flagged as future rather than as missed'
);

select is(
  (
    select bucket->>'goal_reached'
    from jsonb_array_elements(
      public.get_progress_series('UTC', 'year')->'buckets'
    ) as bucket
    where (bucket->>'future')::boolean
    limit 1
  ),
  null,
  'a future bucket never reports a goal result'
);

select ok(
  jsonb_array_length(public.get_progress_series('UTC', 'all')->'buckets') >= 2,
  'the all time range spans every year that has data'
);

-- Totals --------------------------------------------------------------------

select is(
  (public.get_progress_series('UTC', 'week')->>'total'),
  '800',
  'the week total sums only the caller''s own entries'
);

select is(
  (public.get_progress_series('UTC', 'all')->>'total'),
  '1500',
  'the all time total includes entries older than a year'
);

-- Streaks -------------------------------------------------------------------

select is(
  (public.get_progress_series('UTC', 'week')->>'current_streak')::integer,
  2,
  'the current streak counts consecutive active days up to today'
);

select is(
  (public.get_progress_series('UTC', 'all')->>'longest_streak')::integer,
  2,
  'the longest streak is reported alongside the current one'
);

-- Goal accounting -----------------------------------------------------------

select is(
  (public.get_progress_series('UTC', 'week')->>'achieved_goal_days')::integer,
  1,
  'only days at or above the goal count as achieved'
);

-- Validation ----------------------------------------------------------------

select throws_ok(
  $$select public.get_progress_series('UTC', 'decade')$$,
  'INVALID_INPUT',
  'an unknown range is rejected'
);

select throws_ok(
  $$select public.get_progress_series('Not/AZone', 'week')$$,
  'INVALID_INPUT',
  'an invalid timezone is rejected'
);

select * from finish();
rollback;
