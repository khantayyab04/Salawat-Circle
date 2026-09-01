begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '60606060-6060-4060-8060-606060606060',
  'authenticated',
  'authenticated',
  'mvp06-goals@example.test',
  '',
  now(),
  now(),
  now()
);
insert into public.profiles (id, display_name, normalized_name)
values ('60606060-6060-4060-8060-606060606060', 'Goal Member', 'goal member');
insert into public.user_settings (user_id, timezone, locale)
values ('60606060-6060-4060-8060-606060606060', 'UTC', 'de');
insert into private.consent_records (user_id, consent_type, document_version, locale)
values ('60606060-6060-4060-8060-606060606060', 'core_processing', 'mvp-core-v1', 'de');
insert into public.daily_goal_versions (user_id, effective_from, amount)
values (
  '60606060-6060-4060-8060-606060606060',
  (now() at time zone 'UTC')::date - 20,
  100
);

set local role authenticated;
set local "request.jwt.claim.sub" = '60606060-6060-4060-8060-606060606060';
set local "request.jwt.claim.role" = 'authenticated';

with summary as (
  select public.get_home_summary('UTC') as response
), dates as (
  select
    (now() at time zone 'UTC')::date as today,
    (now() at time zone 'UTC')::date -
      (extract(isodow from (now() at time zone 'UTC')::date)::integer - 1) as week_start
)
select is(
  (response->>'eligible_goal_days')::integer,
  (today - week_start + 1)::integer,
  'goal eligibility starts at this Monday rather than the first historic goal'
)
from summary, dates;

select is(
  (public.get_home_summary('UTC')->>'achieved_days')::integer,
  0,
  'days without entries do not count as achieved'
);

reset role;
select is(
  (select amount from public.daily_goal_versions
   where user_id = '60606060-6060-4060-8060-606060606060'
     and effective_from = (now() at time zone 'UTC')::date - 20),
  100,
  'the historic goal version remains immutable'
);

select * from finish();
rollback;
