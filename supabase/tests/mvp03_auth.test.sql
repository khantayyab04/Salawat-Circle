begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'user_settings', 'user settings table exists');
select has_table('private', 'consent_records', 'private consent table exists');
select has_function('public', 'get_onboarding_state', 'onboarding state RPC exists');
select has_function('public', 'upsert_my_profile', 'profile upsert RPC exists');
select has_function('public', 'grant_core_consent', 'consent RPC exists');
select has_function('private', 'has_core_consent', 'consent guard exists');

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'one@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'two@example.test', '', now(), now(), now());

select is(
  private.has_core_consent('11111111-1111-4111-8111-111111111111'::uuid),
  false,
  'the private guard is false before consent'
);

set local role anon;
select throws_ok(
  $$ select count(*) from public.profiles $$,
  '42501',
  null,
  'anonymous clients cannot read profiles'
);
select throws_ok(
  $$ select public.get_onboarding_state() $$,
  '42501',
  null,
  'anonymous clients cannot execute onboarding RPCs'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$ select public.upsert_my_profile('  Jules   Example  ', 'Europe/Berlin', 'de') $$,
  'the current user can complete a profile'
);
select lives_ok(
  $$ select public.upsert_my_profile('Jules Example', 'Europe/Berlin', 'de') $$,
  'profile completion is idempotent'
);
select results_eq(
  $$ select count(*) from public.profiles where id = '11111111-1111-4111-8111-111111111111'::uuid $$,
  array[1::bigint],
  'idempotent profile completion creates one row'
);
select is(
  (public.get_onboarding_state()->>'profile_complete')::boolean,
  true,
  'onboarding reports a complete profile'
);
select is(
  (public.get_onboarding_state()->>'consent_granted')::boolean,
  false,
  'consent is initially absent'
);

select throws_ok(
  $$ select public.upsert_my_profile('x', 'Europe/Berlin', 'de') $$,
  'P0001',
  'INVALID_DISPLAY_NAME',
  'short display names are rejected server-side'
);
select throws_ok(
  $$ select public.upsert_my_profile('Valid Name', 'UTC+2', 'de') $$,
  'P0001',
  'INVALID_TIMEZONE',
  'non-IANA timezones are rejected server-side'
);
select throws_ok(
  $$ select public.upsert_my_profile('Valid Name', 'Europe/Berlin', 'fr') $$,
  'P0001',
  'INVALID_LOCALE',
  'unsupported locales are rejected server-side'
);
select throws_ok(
  $$ select public.upsert_my_profile('Valid Name', 'Europe/Berlin', 'de', '22222222-2222-4222-8222-222222222222'::uuid) $$,
  '42883',
  null,
  'profile RPCs expose no user-id parameter to manipulate'
);

select lives_ok(
  $$ select public.grant_core_consent('de') $$,
  'the current user can grant core consent'
);
select lives_ok(
  $$ select public.grant_core_consent('de') $$,
  'granting the same consent is idempotent'
);
select is(
  (public.get_onboarding_state()->>'consent_granted')::boolean,
  true,
  'onboarding reports granted consent'
);

set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select results_eq(
  $$ select count(*) from public.profiles $$,
  array[0::bigint],
  'another user cannot read the profile'
);
select throws_ok(
  $$ select count(*) from private.consent_records $$,
  '42501',
  null,
  'authenticated clients cannot read private consent records'
);

reset role;
select ok(
  private.has_core_consent('11111111-1111-4111-8111-111111111111'::uuid),
  'the private guard recognizes active consent'
);

select * from finish();
rollback;
