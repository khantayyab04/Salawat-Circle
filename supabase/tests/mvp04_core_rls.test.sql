begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'five@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'six@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('55555555-5555-4555-8555-555555555555', 'RLS Owner', 'rls owner'),
  ('66666666-6666-4666-8666-666666666666', 'RLS Other', 'rls other');
insert into public.user_settings (user_id, timezone, locale)
values
  ('55555555-5555-4555-8555-555555555555', 'Europe/Berlin', 'de'),
  ('66666666-6666-4666-8666-666666666666', 'Europe/Berlin', 'en');
insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('55555555-5555-4555-8555-555555555555', 'core_processing', 'mvp-core-v1', 'de'),
  ('66666666-6666-4666-8666-666666666666', 'core_processing', 'mvp-core-v1', 'en');
insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '55555555-5555-4555-8555-555555555555', 'RLS Circle', 'rls circle', 'Europe/Berlin');
insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '55555555-5555-4555-8555-555555555555', 'mvp04-owner-v1');
insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client)
values
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', '55555555-5555-4555-8555-555555555555', 99, current_date, 'Europe/Berlin', now()),
  ('99999999-9999-4999-8999-999999999999', '66666666-6666-4666-8666-666666666666', 88, current_date, 'Europe/Berlin', now());

select results_eq(
  $$ select relrowsecurity and relforcerowsecurity from pg_catalog.pg_class where oid = 'public.salawat_entries'::regclass $$,
  array[true],
  'entries have RLS enabled and forced'
);
select results_eq(
  $$ select relrowsecurity and relforcerowsecurity from pg_catalog.pg_class where oid = 'public.daily_goal_versions'::regclass $$,
  array[true],
  'goal versions have RLS enabled and forced'
);
select results_eq(
  $$ select relrowsecurity and relforcerowsecurity from pg_catalog.pg_class where oid = 'public.groups'::regclass $$,
  array[true],
  'groups have RLS enabled and forced'
);
select results_eq(
  $$ select relrowsecurity and relforcerowsecurity from pg_catalog.pg_class where oid = 'public.group_memberships'::regclass $$,
  array[true],
  'memberships have RLS enabled and forced'
);

set local role anon;
select throws_ok(
  $$ select count(*) from public.salawat_entries $$,
  '42501',
  null,
  'anonymous clients cannot read entries'
);
select throws_ok(
  $$ select public.list_entries() $$,
  '42501',
  null,
  'anonymous clients cannot execute entry RPCs'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '55555555-5555-4555-8555-555555555555';
set local "request.jwt.claim.role" = 'authenticated';
select results_eq(
  $$ select count(*) from public.salawat_entries $$,
  array[1::bigint],
  'a user can directly read only own entries'
);
select results_eq(
  $$ select count(*) from public.groups $$,
  array[1::bigint],
  'an active member can read permitted group metadata'
);
select throws_ok(
  $$ select owner_user_id from public.groups $$,
  '42501',
  null,
  'direct group reads never expose an owner account identifier'
);
select throws_ok(
  $$ update public.salawat_entries set amount = 1 $$,
  '42501',
  null,
  'direct entry mutation cannot bypass RPC validation'
);
select throws_ok(
  $$ select count(*) from private.group_invites $$,
  '42501',
  null,
  'authenticated clients cannot read private invite hashes'
);
reset role;

select throws_ok(
  $$ update public.salawat_entries set recorded_at_client = clock_timestamp() where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff' $$,
  'P0001',
  'RECORDED_AT_IMMUTABLE',
  'recorded-at time is immutable even for privileged writers'
);
select throws_ok(
  $$ update public.groups set timezone = 'UTC' where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' $$,
  'P0001',
  'GROUP_TIMEZONE_IMMUTABLE',
  'group timezone is immutable even for privileged writers'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '66666666-6666-4666-8666-666666666666';
set local "request.jwt.claim.role" = 'authenticated';
select results_eq(
  $$ select count(*) from public.salawat_entries $$,
  array[1::bigint],
  'another user cannot read the owner entry even in the same database'
);
select results_eq(
  $$ select count(*) from public.groups $$,
  array[0::bigint],
  'a non-member cannot discover the group'
);
select throws_ok(
  $$ select public.update_entry('ffffffff-ffff-4fff-8fff-ffffffffffff', 100, current_date, 1) $$,
  'P0001',
  'NOT_FOUND',
  'a guessed foreign entry id produces no mutation'
);
reset role;

update public.profiles
set status = 'suspended'
where id = '55555555-5555-4555-8555-555555555555';
set local role authenticated;
set local "request.jwt.claim.sub" = '55555555-5555-4555-8555-555555555555';
set local "request.jwt.claim.role" = 'authenticated';
select results_eq(
  $$ select count(*) from public.salawat_entries $$,
  array[0::bigint],
  'a suspended profile loses direct entry access'
);
select results_eq(
  $$ select count(*) from public.groups $$,
  array[0::bigint],
  'a suspended profile loses direct group access'
);
select results_eq(
  $$ select count(*) from public.group_memberships $$,
  array[0::bigint],
  'a suspended profile loses direct membership access'
);
reset role;
update public.profiles
set status = 'active'
where id = '55555555-5555-4555-8555-555555555555';

update public.group_memberships
set left_at = now()
where group_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  and user_id = '55555555-5555-4555-8555-555555555555';
set local role authenticated;
set local "request.jwt.claim.sub" = '55555555-5555-4555-8555-555555555555';
set local "request.jwt.claim.role" = 'authenticated';
select results_eq(
  $$ select count(*) from public.groups $$,
  array[0::bigint],
  'a former member immediately loses direct group access'
);
select throws_ok(
  $$ select public.get_group_leaderboard('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'week') $$,
  'P0001',
  'NOT_FOUND',
  'a former member cannot receive leaderboard aggregates'
);

reset role;
select * from finish();
rollback;
