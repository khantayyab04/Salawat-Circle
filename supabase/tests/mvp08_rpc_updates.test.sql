begin;

create extension if not exists pgtap with schema extensions;
select plan(44);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '72000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'mvp08-rpc-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '72000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'mvp08-rpc-member@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '72000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'mvp08-rpc-limit@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('72000000-0000-4000-8000-000000000001', 'Contract Owner', 'contract owner'),
  ('72000000-0000-4000-8000-000000000002', 'Contract Member', 'contract member'),
  ('72000000-0000-4000-8000-000000000003', 'Contract Limit', 'contract limit');

insert into public.user_settings (user_id, timezone, locale)
values
  ('72000000-0000-4000-8000-000000000001', 'Europe/Berlin', 'de'),
  ('72000000-0000-4000-8000-000000000002', 'Europe/Berlin', 'de'),
  ('72000000-0000-4000-8000-000000000003', 'Europe/Berlin', 'de');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('72000000-0000-4000-8000-000000000001', 'core_processing', 'mvp-core-v1', 'de'),
  ('72000000-0000-4000-8000-000000000002', 'core_processing', 'mvp-core-v1', 'de'),
  ('72000000-0000-4000-8000-000000000003', 'core_processing', 'mvp-core-v1', 'de');

select has_function(
  'public',
  'create_group',
  array['uuid', 'text', 'text', 'boolean', 'boolean'],
  'create_group exposes the MVP08 five-argument client contract'
);
select is(
  to_regprocedure('public.create_group(uuid, text, text)'),
  null::regprocedure,
  'legacy three-argument create_group signature is dropped so acceptance cannot be bypassed'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
    where procedure.oid = 'public.create_group(uuid, text, text, boolean, boolean)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute the create_group RPC'
);
select is(
  pg_catalog.has_function_privilege('anon', 'public.create_group(uuid, text, text, boolean, boolean)', 'EXECUTE'),
  false,
  'anonymous clients cannot execute create_group'
);
select is(
  pg_catalog.has_function_privilege('authenticated', 'public.create_group(uuid, text, text, boolean, boolean)', 'EXECUTE'),
  true,
  'authenticated clients can execute create_group'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
select throws_ok(
  $$ select public.create_group('72a00000-0000-4000-8000-000000000900', 'Missing Subject', 'Europe/Berlin', false, true) $$,
  'P0001',
  'AUTH_REQUIRED',
  'create_group requires a resolved authenticated subject'
);

set local "request.jwt.claim.sub" = '72000000-0000-4000-8000-000000000001';
select throws_ok(
  $$ select public.create_group('72a00000-0000-4000-8000-000000000901', 'Null Anonymous', 'Europe/Berlin', null, true) $$,
  'P0001',
  'INVALID_INPUT',
  'create_group rejects null anonymity choices'
);
select throws_ok(
  $$ select public.create_group('72a00000-0000-4000-8000-000000000902', 'Null Rules', 'Europe/Berlin', false, null) $$,
  'P0001',
  'INVALID_INPUT',
  'create_group rejects null rules acceptance payloads'
);
select throws_ok(
  $$ select public.create_group('72a00000-0000-4000-8000-000000000903', 'False Rules', 'Europe/Berlin', false, false) $$,
  'P0001',
  'CONSENT_REQUIRED',
  'create_group rejects explicit rules non-acceptance with CONSENT_REQUIRED'
);

create temp table created_named as
select public.create_group('72a00000-0000-4000-8000-000000000001', '  Contract   Group  ', 'Europe/Berlin', false, true) as response;

select ok(
  (select not (response ? 'error') from created_named),
  'create_group returns a success envelope for valid named-group creation'
);
select results_eq(
  $$
    select array_agg(key_name order by key_name)
    from created_named,
    lateral jsonb_object_keys(response->'group') as key_row(key_name)
  $$,
  $$ values (array['created_at', 'id', 'leaderboard_anonymous', 'name', 'revision', 'status', 'timezone', 'updated_at']::text[]) $$,
  'create_group group payload exposes only the expected safe keys'
);
select results_eq(
  $$
    select array_agg(key_name order by key_name)
    from created_named,
    lateral jsonb_object_keys(response->'membership') as key_row(key_name)
  $$,
  $$ values (array['created_at', 'group_id', 'id', 'joined_at']::text[]) $$,
  'create_group membership payload exposes only expected membership metadata'
);
select is(
  (select response->'group'->>'status' from created_named),
  'active',
  'create_group returns active status in group payload'
);
select is(
  (select response->'group'->>'leaderboard_anonymous' from created_named),
  'false',
  'named group creation persists leaderboard_anonymous=false'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.group_memberships
    where group_id = '72a00000-0000-4000-8000-000000000001'
      and user_id = '72000000-0000-4000-8000-000000000001'
      and left_at is null
  $$,
  array[1::bigint],
  'create_group creates exactly one active owner membership'
);

create temp table created_named_replay as
select public.create_group('72a00000-0000-4000-8000-000000000001', 'Contract Group', 'Europe/Berlin', false, true) as response;

select is(
  (select response->'membership'->>'id' from created_named_replay),
  (select response->'membership'->>'id' from created_named),
  'idempotent replay returns the original owner membership id'
);
select throws_ok(
  $$ select public.create_group('72a00000-0000-4000-8000-000000000001', 'Contract Group', 'Europe/Berlin', true, true) $$,
  'P0001',
  'INVALID_INPUT',
  'idempotent replay rejects mismatched anonymity values for the same client group id'
);

create temp table created_anonymous as
select public.create_group('72a00000-0000-4000-8000-000000000002', 'Anonymous Contract', 'Europe/Berlin', true, true) as response;

select is(
  (select response->'group'->>'leaderboard_anonymous' from created_anonymous),
  'true',
  'anonymous group creation persists leaderboard_anonymous=true'
);

create temp table listed_groups as
select public.list_my_groups() as response;

select results_eq(
  $$
    select array_agg(key_name order by key_name)
    from listed_groups,
    lateral jsonb_array_elements(response->'items') as item,
    lateral jsonb_object_keys(item) as key_row(key_name)
    where item->>'id' = '72a00000-0000-4000-8000-000000000002'
  $$,
  $$ values (array['calculated_at', 'id', 'leaderboard_anonymous', 'member_count', 'name', 'own_rank', 'own_week_total', 'revision', 'role', 'timezone', 'updated_at']::text[]) $$,
  'list_my_groups item payload exposes the finalized safe key contract'
);
select is(
  (
    select item->>'role'
    from listed_groups,
    lateral jsonb_array_elements(response->'items') as item
    where item->>'id' = '72a00000-0000-4000-8000-000000000002'
  ),
  'owner',
  'list_my_groups reports owner role for owned groups'
);
select is(
  (
    select item->>'leaderboard_anonymous'
    from listed_groups,
    lateral jsonb_array_elements(response->'items') as item
    where item->>'id' = '72a00000-0000-4000-8000-000000000002'
  ),
  'true',
  'list_my_groups reports anonymity choices per group'
);
select is(
  (select jsonb_path_exists(response, '$.**.alias_epoch') from listed_groups),
  false,
  'list_my_groups payload never exposes private alias_epoch metadata'
);
select is(
  (select jsonb_path_exists(response, '$.**.alias_key') from listed_groups),
  false,
  'list_my_groups payload never exposes private alias_key metadata'
);
select is(
  (select jsonb_path_exists(response, '$.**.owner_user_id') from listed_groups),
  false,
  'list_my_groups payload never exposes owner_user_id'
);

reset role;
insert into public.group_memberships (id, group_id, user_id, joined_at, sharing_consent_version)
values
  ('72b00000-0000-4000-8000-000000000101', '72a00000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', clock_timestamp() - interval '1 day', 'mvp08-rpc-updates-v1'),
  ('72b00000-0000-4000-8000-000000000201', '72a00000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000002', clock_timestamp() - interval '1 day', 'mvp08-rpc-updates-v1');

insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client)
values
  ('72c00000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 70, current_date, 'Europe/Berlin', clock_timestamp() - interval '30 minutes'),
  ('72c00000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', 50, current_date, 'Europe/Berlin', clock_timestamp() - interval '20 minutes');

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '72000000-0000-4000-8000-000000000001';

create temp table named_board as
select public.get_group_leaderboard('72a00000-0000-4000-8000-000000000001', 'week', null, null, null, 20) as response;

create temp table anonymous_board as
select public.get_group_leaderboard('72a00000-0000-4000-8000-000000000002', 'week', null, null, null, 20) as response;

select results_eq(
  $$
    select array_agg(key_name order by key_name)
    from named_board,
    lateral jsonb_object_keys(response->'group') as key_row(key_name)
  $$,
  $$ values (array['id', 'is_owner', 'leaderboard_anonymous', 'member_count', 'name', 'revision', 'role', 'timezone']::text[]) $$,
  'named leaderboard group payload exposes the finalized safe key contract'
);
select results_eq(
  $$
    select array_agg(key_name order by key_name)
    from anonymous_board,
    lateral jsonb_object_keys(response->'group') as key_row(key_name)
  $$,
  $$ values (array['id', 'is_owner', 'leaderboard_anonymous', 'member_count', 'name', 'revision', 'role', 'timezone']::text[]) $$,
  'anonymous leaderboard group payload exposes the finalized safe key contract'
);
select is(
  (select response->'group'->>'role' from anonymous_board),
  'owner',
  'leaderboard group metadata reports owner role for the caller'
);
select is(
  (select response->'group'->>'is_owner' from anonymous_board),
  'true',
  'leaderboard group metadata reports is_owner=true for owner callers'
);
select is(
  (select response->'group'->>'member_count' from anonymous_board),
  '2',
  'leaderboard group metadata includes the active member count'
);
select is(
  (select response->>'own_alias' from named_board),
  null,
  'named leaderboard keeps own_alias null'
);
select is(
  (
    select item->>'display_name'
    from named_board,
    lateral jsonb_array_elements(response->'items') as item
    where item->>'row_id' = '72b00000-0000-4000-8000-000000000201'
  ),
  'Contract Member',
  'named leaderboard keeps foreign member real names'
);
select is(
  (select response->>'own_alias' from anonymous_board),
  (
    select membership.alias_name
    from public.group_memberships membership
    where membership.group_id = '72a00000-0000-4000-8000-000000000002'
      and membership.user_id = '72000000-0000-4000-8000-000000000001'
      and membership.left_at is null
  ),
  'anonymous leaderboard returns own_alias for the caller'
);
select is(
  (
    select item->>'display_name'
    from anonymous_board,
    lateral jsonb_array_elements(response->'items') as item
    where item->>'row_id' = (
      select membership.alias_key::text
      from public.group_memberships membership
      where membership.id = '72b00000-0000-4000-8000-000000000101'
    )
  ),
  (
    select membership.alias_name
    from public.group_memberships membership
    where membership.id = '72b00000-0000-4000-8000-000000000101'
  ),
  'anonymous leaderboard uses foreign aliases as display names'
);
select isnt(
  (
    select item->>'row_id'
    from anonymous_board,
    lateral jsonb_array_elements(response->'items') as item
    where item->>'display_name' = (
      select membership.alias_name
      from public.group_memberships membership
      where membership.id = '72b00000-0000-4000-8000-000000000101'
    )
  ),
  '72b00000-0000-4000-8000-000000000101',
  'anonymous leaderboard row_id never exposes foreign membership ids'
);
select is(
  (
    select item->>'row_id'
    from named_board,
    lateral jsonb_array_elements(response->'items') as item
    where item->>'display_name' = 'Contract Member'
  ),
  '72b00000-0000-4000-8000-000000000201',
  'named leaderboard row_id remains the stable membership id'
);
select is(
  (select jsonb_path_exists(response, '$.**.owner_user_id') from anonymous_board),
  false,
  'leaderboard payload never exposes owner_user_id'
);
select is(
  (select jsonb_path_exists(response, '$.**.alias_key') from anonymous_board),
  false,
  'leaderboard payload never exposes alias_key field names'
);

reset role;
insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
select
  ('73a00000-0000-4000-8000-' || lpad(seed::text, 12, '0'))::uuid,
  '72000000-0000-4000-8000-000000000003'::uuid,
  'Limit Seed Group ' || seed::text,
  pg_catalog.lower('Limit Seed Group ' || seed::text),
  'Europe/Berlin'
from generate_series(1, 49) as seed;

insert into public.group_memberships (id, group_id, user_id, joined_at, sharing_consent_version)
select
  ('73b00000-0000-4000-8000-' || lpad(seed::text, 12, '0'))::uuid,
  ('73a00000-0000-4000-8000-' || lpad(seed::text, 12, '0'))::uuid,
  '72000000-0000-4000-8000-000000000003'::uuid,
  clock_timestamp() - interval '2 days',
  'mvp08-rpc-updates-v1'
from generate_series(1, 49) as seed;

create temp table day_window as
select private.rate_limit_bucket_start(pg_catalog.clock_timestamp(), 86400) as bucket_start;

delete from private.rate_limit_buckets
where actor_key = '72000000-0000-4000-8000-000000000003'
  and action_key = 'create_group'
  and window_key = 'day';

insert into private.rate_limit_buckets (actor_key, action_key, window_key, bucket_start, hit_count)
select
  '72000000-0000-4000-8000-000000000003',
  'create_group',
  'day',
  bucket_start,
  9
from day_window;

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '72000000-0000-4000-8000-000000000003';

create temp table limit_group_50th as
select public.create_group('72a00000-0000-4000-8000-000000000050', 'Limit Group 50', 'Europe/Berlin', false, true) as response;

select ok(
  (
    select response->'group'->>'id' = '72a00000-0000-4000-8000-000000000050'
      and not (response ? 'error')
    from limit_group_50th
  ),
  'fiftieth active group membership creation succeeds at the cap boundary'
);
select throws_ok(
  $$ select public.create_group('72a00000-0000-4000-8000-000000000051', 'Limit Group 51', 'Europe/Berlin', false, true) $$,
  'P0001',
  'GROUP_LIMIT_REACHED',
  'new group creation is rejected once the account already has fifty active group memberships'
);
create temp table limit_group_50th_replay as
select public.create_group('72a00000-0000-4000-8000-000000000050', 'Limit Group 50', 'Europe/Berlin', false, true) as response;

select is(
  (select response->'membership'->>'id' from limit_group_50th_replay),
  (select response->'membership'->>'id' from limit_group_50th),
  'idempotent replay remains successful and free at the membership cap'
);

reset role;
select results_eq(
  $$
    select count(*)::bigint
    from public.group_memberships membership
    join public.groups group_row
      on group_row.id = membership.group_id
    where membership.user_id = '72000000-0000-4000-8000-000000000003'
      and membership.left_at is null
      and group_row.status = 'active'
  $$,
  array[50::bigint],
  'membership cap enforcement never creates a fifty-first active membership'
);
select is(
  (
    select hit_count
    from private.rate_limit_buckets
    where actor_key = '72000000-0000-4000-8000-000000000003'
      and action_key = 'create_group'
      and window_key = 'day'
      and bucket_start = (select bucket_start from day_window)
  ),
  10,
  'failed creation and idempotent replay do not consume extra create_group day-rate slots'
);

create temp table create_group_definition as
select lower(pg_catalog.pg_get_functiondef('public.create_group(uuid, text, text, boolean, boolean)'::regprocedure)) as definition;

select ok(
  (
    select
      position('from public.profiles profile_row
  where profile_row.id = v_user_id
  for update' in definition) > 0
    from create_group_definition
  ),
  'create_group implementation locks caller profiles FOR UPDATE for concurrency-safe cap checks'
);
select ok(
  (
    select
      position('from public.profiles profile_row' in definition) > 0
      and position('into v_active_group_count' in definition) > position('from public.profiles profile_row' in definition)
      and position('insert into public.groups' in definition) > position('into v_active_group_count' in definition)
    from create_group_definition
  ),
  'create_group lock, membership count, and insert happen in stable order'
);

select * from finish();
rollback;
