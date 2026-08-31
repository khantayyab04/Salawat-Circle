begin;

create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'three@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'four@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('33333333-3333-4333-8333-333333333333', 'Member One', 'member one'),
  ('44444444-4444-4444-8444-444444444444', 'Member Two', 'member two');
insert into public.user_settings (user_id, timezone, locale)
values
  ('33333333-3333-4333-8333-333333333333', 'Europe/Berlin', 'de'),
  ('44444444-4444-4444-8444-444444444444', 'Europe/Berlin', 'en');

set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$ select public.create_entry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 10, current_date, 'Europe/Berlin', now()) $$,
  'P0001',
  'CONSENT_REQUIRED',
  'entry mutations require the MVP03 core consent'
);

reset role;
insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('33333333-3333-4333-8333-333333333333', 'core_processing', 'mvp-core-v1', 'de'),
  ('44444444-4444-4444-8444-444444444444', 'core_processing', 'mvp-core-v1', 'en');
set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$ select public.create_entry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 10, current_date, 'Europe/Berlin', now()) $$,
  'a consented member can create an entry'
);
select results_eq(
  $$ select count(*) from public.salawat_entries where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  array[1::bigint],
  'entry creation stores exactly one row'
);
select lives_ok(
  $$ select public.create_entry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 10, current_date, 'Europe/Berlin', now()) $$,
  'same entry id and semantic content is idempotent'
);
select results_eq(
  $$ select count(*) from public.salawat_entries where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  array[1::bigint],
  'idempotency never creates a duplicate entry'
);
select throws_ok(
  $$ select public.create_entry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 11, current_date, 'Europe/Berlin', now()) $$,
  'P0001',
  'INVALID_INPUT',
  'a reused entry id with different content is rejected'
);
select throws_ok(
  $$ select public.create_entry('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 0, current_date, 'Europe/Berlin', now()) $$,
  'P0001',
  'INVALID_AMOUNT',
  'zero amount is rejected by the RPC'
);
select throws_ok(
  $$ select public.create_entry('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 10, current_date + 1, 'Europe/Berlin', now()) $$,
  'P0001',
  'INVALID_DATE',
  'a future entry date is rejected by the RPC'
);
select throws_ok(
  $$ select public.update_entry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 11, current_date, 2) $$,
  'P0001',
  'ENTRY_VERSION_CONFLICT',
  'a stale entry revision changes nothing'
);
select lives_ok(
  $$ select public.update_entry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 11, current_date, 1) $$,
  'the current entry revision can be updated'
);
select results_eq(
  $$ select amount, revision from public.salawat_entries where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  $$ values (11, 2) $$,
  'a successful entry update increases revision exactly once'
);
select lives_ok(
  $$ select public.delete_entry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2) $$,
  'the owner can delete the current entry revision'
);
select is(
  (public.delete_entry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2)->>'deleted')::boolean,
  true,
  'repeating an own delete is idempotently successful'
);

select lives_ok(
  $$ select public.set_daily_goal(current_date, 100) $$,
  'today can receive a daily goal'
);
select lives_ok(
  $$ select public.set_daily_goal(current_date, 200) $$,
  'a same-day goal choice is deterministic'
);
select results_eq(
  $$ select count(*), max(amount) from public.daily_goal_versions where effective_from = current_date $$,
  $$ values (1::bigint, 200) $$,
  'a same-day goal update leaves one current goal version'
);
select throws_ok(
  $$ select public.set_daily_goal(current_date - 1, 100) $$,
  'P0001',
  'INVALID_DATE',
  'historic goal versions cannot be overwritten through the app RPC'
);

select lives_ok(
  $$ select public.create_group('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '  Morning   Circle  ', 'Europe/Berlin', false, true) $$,
  'a group and owner membership are created atomically'
);
select results_eq(
  $$ select count(*) from public.groups where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' $$,
  array[1::bigint],
  'group creation stores one group'
);
select results_eq(
  $$ select count(*) from public.group_memberships where group_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and user_id = '33333333-3333-4333-8333-333333333333' and left_at is null $$,
  array[1::bigint],
  'group creation stores one active owner membership'
);
select lives_ok(
  $$ select public.create_group('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Morning Circle', 'Europe/Berlin', false, true) $$,
  'a repeated same group request is idempotent'
);
select results_eq(
  $$ select count(*) from public.group_memberships where group_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and user_id = '33333333-3333-4333-8333-333333333333' and left_at is null $$,
  array[1::bigint],
  'idempotent group creation never adds a second owner membership'
);
select lives_ok(
  $$ select public.update_group_name('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Evening Circle', 1) $$,
  'the owner can rename with the current revision'
);
select throws_ok(
  $$ select public.update_group_name('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Another Circle', 1) $$,
  'P0001',
  'ENTRY_VERSION_CONFLICT',
  'a stale group revision is rejected'
);
select throws_ok(
  $$ select public.create_group('17171717-1717-4171-8171-171717171717', 'Invalid Timezone', 'UTC+2', false, true) $$,
  'P0001',
  'INVALID_INPUT',
  'group creation validates an IANA timezone server-side'
);

set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
select results_eq(
  $$ select count(*) from public.groups $$,
  array[0::bigint],
  'a non-member cannot directly discover a group'
);
select throws_ok(
  $$ select public.get_group_leaderboard('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'week', null, null, null, 20) $$,
  'P0001',
  'NOT_FOUND',
  'a non-member gets no useful group existence signal from the leaderboard'
);
select throws_ok(
  $$ select count(*) from private.group_invites $$,
  '42501',
  null,
  'authenticated users cannot read private invitation hashes'
);

reset role;

insert into public.group_memberships (group_id, user_id, joined_at, sharing_consent_version)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '44444444-4444-4444-8444-444444444444',
  now(),
  'mvp04-test-v1'
);
insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client)
values (
  '18181818-1818-4181-8181-181818181818',
  '44444444-4444-4444-8444-444444444444',
  500,
  current_date,
  'Europe/Berlin',
  clock_timestamp() - interval '1 day'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
set local "request.jwt.claim.role" = 'authenticated';
select is(
  public.list_my_groups()->'items'->0->>'own_week_total',
  '0',
  'my group summary excludes own values recorded before joining'
);
select is(
  public.get_group_leaderboard('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'week')->'items'->1->>'total',
  '0',
  'leaderboards exclude values recorded before the active membership began'
);
select ok(
  public.get_group_leaderboard('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'week')::text not like '%four@example.test%',
  'leaderboards never expose member email addresses'
);

reset role;
update public.groups
set status = 'suspended'
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
set local "request.jwt.claim.role" = 'authenticated';
select is(
  jsonb_array_length(public.list_my_groups()->'items'),
  0,
  'a suspended group is excluded from member summaries'
);

reset role;
update public.profiles
set status = 'suspended'
where id = '44444444-4444-4444-8444-444444444444';
set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
set local "request.jwt.claim.role" = 'authenticated';
select throws_ok(
  $$ select public.list_entries() $$,
  'P0001',
  'FORBIDDEN',
  'a suspended profile is blocked before personal data access'
);

reset role;
select * from finish();
rollback;
