begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444441',
   'authenticated', 'authenticated', 'mvp12-period-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444442',
   'authenticated', 'authenticated', 'mvp12-period-member@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444443',
   'authenticated', 'authenticated', 'mvp12-period-outsider@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('44444444-4444-4444-8444-444444444441', 'Period Owner', 'period owner'),
  ('44444444-4444-4444-8444-444444444442', 'Period Member', 'period member'),
  ('44444444-4444-4444-8444-444444444443', 'Period Outsider', 'period outsider');

insert into public.user_settings (user_id, timezone, locale)
values
  ('44444444-4444-4444-8444-444444444441', 'UTC', 'en'),
  ('44444444-4444-4444-8444-444444444442', 'UTC', 'en'),
  ('44444444-4444-4444-8444-444444444443', 'UTC', 'en');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('44444444-4444-4444-8444-444444444441', 'core_processing', 'mvp-core-v1', 'en'),
  ('44444444-4444-4444-8444-444444444442', 'core_processing', 'mvp-core-v1', 'en'),
  ('44444444-4444-4444-8444-444444444443', 'core_processing', 'mvp-core-v1', 'en');

insert into public.groups (id, name, normalized_name, owner_user_id, timezone, status)
values ('44444444-4444-4444-8444-4444444444a1', 'Period Circle', 'period circle',
        '44444444-4444-4444-8444-444444444441', 'UTC', 'active');

insert into public.group_memberships (
  id, group_id, user_id, joined_at, sharing_consent_version
) values
  ('44444444-4444-4444-8444-4444444444b1', '44444444-4444-4444-8444-4444444444a1',
   '44444444-4444-4444-8444-444444444441', now() - interval '400 days',
   'mvp08-group-sharing-v1'),
  ('44444444-4444-4444-8444-4444444444b2', '44444444-4444-4444-8444-4444444444a1',
   '44444444-4444-4444-8444-444444444442', now() - interval '400 days',
   'mvp08-group-sharing-v1');

-- One entry inside the current week, one earlier in the current month and one
-- last year, so the three periods each cover a different amount.
insert into public.salawat_entries (
  id, user_id, amount, entry_date, timezone, recorded_at_client
) values
  ('44444444-4444-4444-8444-4444444444c1', '44444444-4444-4444-8444-444444444441', 100,
   (now() at time zone 'UTC')::date, 'UTC', now()),
  ('44444444-4444-4444-8444-4444444444c2', '44444444-4444-4444-8444-444444444442', 50,
   date_trunc('month', (now() at time zone 'UTC')::date)::date, 'UTC',
   now() - interval '1 day'),
  ('44444444-4444-4444-8444-4444444444c3', '44444444-4444-4444-8444-444444444441', 900,
   (now() at time zone 'UTC')::date - 300, 'UTC', now() - interval '300 days');

set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444441';
set local "request.jwt.claim.role" = 'authenticated';

-- Leaderboard --------------------------------------------------------------

select lives_ok(
  $$select public.get_group_leaderboard(
      '44444444-4444-4444-8444-4444444444a1', 'month'
    )$$,
  'the leaderboard accepts the month period'
);

select is(
  public.get_group_leaderboard(
    '44444444-4444-4444-8444-4444444444a1', 'month'
  )->>'period',
  'month',
  'the leaderboard reports back the requested period'
);

select throws_ok(
  $$select public.get_group_leaderboard(
      '44444444-4444-4444-8444-4444444444a1', 'decade'
    )$$,
  'INVALID_INPUT',
  'the leaderboard still rejects an unknown period'
);

-- Group goals ---------------------------------------------------------------

select lives_ok(
  $$select public.set_group_goal(
      '44444444-4444-4444-8444-4444444444a1',
      'all',
      500000,
      (select revision from public.groups
        where id = '44444444-4444-4444-8444-4444444444a1')
    )$$,
  'a group goal can be set for the all time period'
);

select throws_ok(
  $$select public.set_group_goal(
      '44444444-4444-4444-8444-4444444444a1',
      'forever',
      1,
      (select revision from public.groups
        where id = '44444444-4444-4444-8444-4444444444a1')
    )$$,
  'INVALID_INPUT',
  'set_group_goal still rejects an unknown period'
);

-- Insights ------------------------------------------------------------------

select is(
  public.get_group_insights(
    '44444444-4444-4444-8444-4444444444a1', 'month'
  )->>'period',
  'month',
  'insights report back the requested period'
);

select ok(
  (public.get_group_insights(
     '44444444-4444-4444-8444-4444444444a1', 'all'
   )->>'period_total')::bigint
  >=
  (public.get_group_insights(
     '44444444-4444-4444-8444-4444444444a1', 'week'
   )->>'period_total')::bigint,
  'the all time total is never smaller than the week total'
);

select throws_ok(
  $$select public.get_group_insights(
      '44444444-4444-4444-8444-4444444444a1', 'decade'
    )$$,
  'INVALID_INPUT',
  'insights reject an unknown period'
);

-- Outsiders stay locked out of every period --------------------------------

set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444443';

select throws_ok(
  $$select public.get_group_insights(
      '44444444-4444-4444-8444-4444444444a1', 'month'
    )$$,
  'NOT_FOUND',
  'a non member cannot read insights for any period'
);

select * from finish();
rollback;
