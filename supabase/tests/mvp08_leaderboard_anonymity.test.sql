begin;

create extension if not exists pgtap with schema extensions;
select plan(80);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'mvp08-leaderboard-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'mvp08-leaderboard-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'mvp08-leaderboard-b@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'mvp08-leaderboard-c@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'mvp08-leaderboard-d@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'mvp08-leaderboard-outsider@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'mvp08-leaderboard-historical@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'mvp08-leaderboard-new-member@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('71000000-0000-4000-8000-000000000001', 'Owner Real', 'owner real'),
  ('71000000-0000-4000-8000-000000000002', 'Zeta Foreign Alpha', 'zeta foreign alpha'),
  ('71000000-0000-4000-8000-000000000003', 'Zeta Foreign Beta', 'zeta foreign beta'),
  ('71000000-0000-4000-8000-000000000004', 'Zeta Foreign Gamma', 'zeta foreign gamma'),
  ('71000000-0000-4000-8000-000000000005', 'Late Joiner', 'late joiner'),
  ('71000000-0000-4000-8000-000000000006', 'Outside Viewer', 'outside viewer'),
  ('71000000-0000-4000-8000-000000000007', 'Former Member', 'former member'),
  ('71000000-0000-4000-8000-000000000008', 'Current Epoch Joiner', 'current epoch joiner');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('71000000-0000-4000-8000-000000000001', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000002', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000003', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000004', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000005', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000006', 'core_processing', 'mvp-core-v1', 'en'),
  ('71000000-0000-4000-8000-000000000008', 'core_processing', 'mvp-core-v1', 'de');

insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values (
  '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
  '71000000-0000-4000-8000-000000000001',
  'Anonymity Circle',
  'anonymity circle',
  'Europe/Berlin'
);

insert into public.group_memberships (id, group_id, user_id, joined_at, sharing_consent_version)
values
  (
    '7b000000-0000-4000-8000-000000000001',
    '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
    '71000000-0000-4000-8000-000000000001',
    clock_timestamp() - interval '5 days',
    'mvp08-leaderboard-v1'
  ),
  (
    '7b000000-0000-4000-8000-000000000002',
    '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
    '71000000-0000-4000-8000-000000000002',
    clock_timestamp() - interval '5 days',
    'mvp08-leaderboard-v1'
  ),
  (
    '7b000000-0000-4000-8000-000000000003',
    '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
    '71000000-0000-4000-8000-000000000003',
    clock_timestamp() - interval '5 days',
    'mvp08-leaderboard-v1'
  ),
  (
    '7b000000-0000-4000-8000-000000000004',
    '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
    '71000000-0000-4000-8000-000000000004',
    clock_timestamp() - interval '5 days',
    'mvp08-leaderboard-v1'
  ),
  (
    '7b000000-0000-4000-8000-000000000005',
    '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
    '71000000-0000-4000-8000-000000000005',
    clock_timestamp() - interval '2 days',
    'mvp08-leaderboard-v1'
  );

insert into public.group_memberships (
  id, group_id, user_id, joined_at, left_at, sharing_consent_version, alias_name, alias_normalized
)
values (
  '7b000000-0000-4000-8000-000000000006',
  '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
  '71000000-0000-4000-8000-000000000007',
  clock_timestamp() - interval '10 days',
  clock_timestamp() - interval '3 days',
  'mvp08-leaderboard-v1',
  'Historischer Alias',
  'historischer alias'
);

insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client)
values
  (
    '7c000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    300,
    current_date,
    'Europe/Berlin',
    clock_timestamp() - interval '1 hour'
  ),
  (
    '7c000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    200,
    current_date,
    'Europe/Berlin',
    clock_timestamp() - interval '1 hour'
  ),
  (
    '7c000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000003',
    100,
    current_date,
    'Europe/Berlin',
    clock_timestamp() - interval '1 hour'
  ),
  (
    '7c000000-0000-4000-8000-000000000004',
    '71000000-0000-4000-8000-000000000004',
    50,
    current_date,
    'Europe/Berlin',
    clock_timestamp() - interval '1 hour'
  ),
  (
    '7c000000-0000-4000-8000-000000000005',
    '71000000-0000-4000-8000-000000000005',
    11,
    current_date,
    'Europe/Berlin',
    clock_timestamp() - interval '2 days 1 minute'
  ),
  (
    '7c000000-0000-4000-8000-000000000006',
    '71000000-0000-4000-8000-000000000005',
    22,
    current_date,
    'Europe/Berlin',
    clock_timestamp() - interval '1 day 23 hours 59 minutes'
  ),
  (
    '7c000000-0000-4000-8000-000000000007',
    '71000000-0000-4000-8000-000000000005',
    33,
    current_date - 14,
    'Europe/Berlin',
    clock_timestamp() - interval '1 day'
  );

create temp table aliases_before as
select id, alias_name, alias_normalized, alias_key
from public.group_memberships
where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  and left_at is null
order by joined_at, id;

create temp table group_before as
select alias_epoch
from public.groups
where id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70';

select has_function(
  'public',
  'set_group_leaderboard_anonymity',
  array['uuid', 'boolean', 'integer'],
  'leaderboard anonymity toggle RPC exists'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
    where procedure.oid = 'public.set_group_leaderboard_anonymity(uuid, boolean, integer)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute leaderboard anonymity toggle RPC'
);
select is(
  pg_catalog.has_function_privilege('anon', 'public.set_group_leaderboard_anonymity(uuid, boolean, integer)', 'EXECUTE'),
  false,
  'anonymous clients cannot execute leaderboard anonymity toggle RPC'
);
select is(
  pg_catalog.has_function_privilege('authenticated', 'public.set_group_leaderboard_anonymity(uuid, boolean, integer)', 'EXECUTE'),
  true,
  'authenticated clients can execute leaderboard anonymity toggle RPC'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
select throws_ok(
  $$ select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'week') $$,
  'P0001',
  'AUTH_REQUIRED',
  'leaderboard reads require authenticated identity'
);
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 1) $$,
  'P0001',
  'AUTH_REQUIRED',
  'anonymity toggles require authenticated identity'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';

create temp table named_week as
select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'week', null, null, null, 20) as response;

create temp table named_all_time as
select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'all_time', null, null, null, 20) as response;

select ok(
  (select response->'group' ?& array['id', 'name', 'timezone', 'leaderboard_anonymous'] from named_week),
  'leaderboard group metadata includes anonymity flag with id/name/timezone'
);
select is(
  (select response->'group'->>'leaderboard_anonymous' from named_week),
  'false',
  'named leaderboard reports anonymity disabled by default'
);
select is(
  (
    select item->>'display_name'
    from named_week,
    lateral jsonb_array_elements(response->'items') item
    where item->>'row_id' = '7b000000-0000-4000-8000-000000000001'
  ),
  'Owner Real',
  'named leaderboard keeps the caller display name visible'
);
select is(
  (
    select item->>'display_name'
    from named_week,
    lateral jsonb_array_elements(response->'items') item
    where item->>'row_id' = '7b000000-0000-4000-8000-000000000002'
  ),
  'Zeta Foreign Alpha',
  'named leaderboard keeps foreign member real names'
);
select is(
  (
    select item->>'is_self'
    from named_week,
    lateral jsonb_array_elements(response->'items') item
    where item->>'row_id' = '7b000000-0000-4000-8000-000000000001'
  ),
  'true',
  'named leaderboard marks the own row'
);
select is(
  (select response->>'own_alias' from named_week),
  null,
  'named leaderboard omits own_alias when anonymity is disabled'
);
select ok(
  (
    select bool_and(item ? 'row_id' and not (item ? 'membership_id'))
    from named_week,
    lateral jsonb_array_elements(response->'items') item
  ),
  'named leaderboard exposes neutral row_id keys only'
);
select is(
  (
    select item->>'row_id'
    from named_week,
    lateral jsonb_array_elements(response->'items') item
    where item->>'display_name' = 'Owner Real'
  ),
  '7b000000-0000-4000-8000-000000000001',
  'named row_id equals membership id while anonymity is disabled'
);
select is(
  (
    select (item->>'total')::bigint
    from named_week,
    lateral jsonb_array_elements(response->'items') item
    where item->>'row_id' = '7b000000-0000-4000-8000-000000000005'
  ),
  22::bigint,
  'weekly leaderboard excludes pre-join values and out-of-week values'
);
select is(
  (
    select (item->>'total')::bigint
    from named_all_time,
    lateral jsonb_array_elements(response->'items') item
    where item->>'row_id' = '7b000000-0000-4000-8000-000000000005'
  ),
  55::bigint,
  'all-time leaderboard keeps post-join values while excluding pre-join values'
);
select throws_ok(
  $$ select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'month') $$,
  'P0001',
  'INVALID_INPUT',
  'leaderboard rejects unsupported periods'
);
select throws_ok(
  $$ select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', null) $$,
  'P0001',
  'INVALID_INPUT',
  'leaderboard rejects null periods explicitly'
);
select throws_ok(
  $$ select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'week', 1, 'abc', null, 20) $$,
  'P0001',
  'INVALID_INPUT',
  'leaderboard rejects partial cursor payloads'
);

set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000006';
select throws_ok(
  $$ select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'week') $$,
  'P0001',
  'NOT_FOUND',
  'non-members still receive NOT_FOUND from leaderboard reads'
);

set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000002';
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 1) $$,
  'P0001',
  'NOT_FOUND',
  'non-owner members cannot toggle leaderboard anonymity'
);

set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000006';
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 1) $$,
  'P0001',
  'NOT_FOUND',
  'outsiders cannot toggle leaderboard anonymity'
);

set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 2) $$,
  'P0001',
  'ENTRY_VERSION_CONFLICT',
  'stale group revisions are rejected by the anonymity toggle'
);
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity(null, true, 1) $$,
  'P0001',
  'INVALID_INPUT',
  'toggle rejects null group ids'
);
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', null, 1) $$,
  'P0001',
  'INVALID_INPUT',
  'toggle rejects null anonymity values'
);
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, null) $$,
  'P0001',
  'INVALID_INPUT',
  'toggle rejects null expected revisions'
);

create temp table toggle_enable (response jsonb);
select lives_ok(
  $$ insert into toggle_enable select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 1) $$,
  'owners can enable leaderboard anonymity with the current revision'
);
select is(
  (select response->'group'->>'leaderboard_anonymous' from toggle_enable),
  'true',
  'enabling anonymity persists leaderboard_anonymous=true'
);
select is(
  (select (response->'group'->>'revision')::integer from toggle_enable),
  2,
  'enabling anonymity increments revision exactly once'
);

reset role;
create temp table aliases_after_enable as
select id, alias_name, alias_normalized, alias_key
from public.group_memberships
where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  and left_at is null
order by joined_at, id;
create temp table group_after_enable as
select alias_epoch
from public.groups
where id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70';

select results_eq(
  $$
    select count(*)
    from aliases_after_enable after_enable
    join aliases_before before_enable using (id)
    where after_enable.alias_normalized is distinct from before_enable.alias_normalized
  $$,
  array[5::bigint],
  'enabling anonymity rotates aliases for every active membership'
);
select results_eq(
  $$
    select count(*)
    from aliases_after_enable after_enable
    join aliases_before before_enable using (id)
    where after_enable.alias_key is distinct from before_enable.alias_key
  $$,
  array[5::bigint],
  'enabling anonymity rotates opaque row keys for every active membership'
);
select results_eq(
  $$
    select (count(*) = count(distinct alias_normalized))::boolean
    from aliases_after_enable
  $$,
  array[true],
  'rotated aliases remain unique among active memberships'
);
select results_eq(
  $$
    select (count(*) = count(distinct alias_key))::boolean
    from aliases_after_enable
  $$,
  array[true],
  'rotated opaque row keys remain unique among active memberships'
);
select is(
  (
    select (after_enable.alias_epoch is distinct from before_enable.alias_epoch)::text
    from group_before before_enable
    cross join group_after_enable after_enable
  ),
  'true',
  'enabling anonymity rotates the group alias epoch'
);
select is(
  (
    select alias_name
    from public.group_memberships
    where id = '7b000000-0000-4000-8000-000000000006'
  ),
  'Historischer Alias',
  'historical membership alias_name is untouched by active alias rotation'
);
select is(
  (
    select alias_normalized
    from public.group_memberships
    where id = '7b000000-0000-4000-8000-000000000006'
  ),
  'historischer alias',
  'historical membership alias_normalized is untouched by active alias rotation'
);
select is(
  (
    select alias_key
    from public.group_memberships
    where id = '7b000000-0000-4000-8000-000000000006'
  )::text,
  null,
  'historical membership alias_key remains untouched'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table anon_page_one as
select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'all_time', null, null, null, 2) as response;

reset role;
select is(
  (
    select item->>'display_name'
    from anon_page_one,
    lateral jsonb_array_elements(response->'items') item
    where item->>'display_name' = 'Owner Real'
  ),
  'Owner Real',
  'anonymous leaderboard keeps the caller real display name'
);
select is(
  (
    select item->>'is_self'
    from anon_page_one,
    lateral jsonb_array_elements(response->'items') item
    where item->>'display_name' = 'Owner Real'
  ),
  'true',
  'anonymous leaderboard marks the own row as is_self=true'
);
select is(
  (
    select item->>'display_name'
    from anon_page_one,
    lateral jsonb_array_elements(response->'items') item
    where item->>'display_name' = (
      select alias_name
      from aliases_after_enable
      where id = '7b000000-0000-4000-8000-000000000002'
    )
  ),
  (
    select alias_name
    from aliases_after_enable
    where id = '7b000000-0000-4000-8000-000000000002'
  ),
  'anonymous leaderboard exposes only aliases for foreign rows'
);
select is(
  (select response->>'own_alias' from anon_page_one),
  (
    select alias_name
    from aliases_after_enable
    where id = '7b000000-0000-4000-8000-000000000001'
  ),
  'anonymous leaderboard returns own_alias so callers know what others see'
);
select ok(
  (
    select bool_and(item ? 'row_id' and not (item ? 'membership_id'))
    from anon_page_one,
    lateral jsonb_array_elements(response->'items') item
  ),
  'anonymous leaderboard items expose only neutral row_id keys'
);
select ok(
  (
    select item->>'row_id' <> '7b000000-0000-4000-8000-000000000002'
    from anon_page_one,
    lateral jsonb_array_elements(response->'items') item
    where item->>'display_name' = (
      select alias_name
      from aliases_after_enable
      where id = '7b000000-0000-4000-8000-000000000002'
    )
  ),
  'anonymous foreign row_id is not the stable membership id'
);
select ok(
  (
    select response->'next_cursor' ? 'row_id'
      and not (response->'next_cursor' ? 'membership_id')
    from anon_page_one
  ),
  'anonymous cursor uses neutral row_id key and omits membership_id'
);
select is(
  (select response->'next_cursor'->>'sort_name' from anon_page_one),
  (
    select alias_normalized
    from aliases_after_enable
    where id = '7b000000-0000-4000-8000-000000000002'
  ),
  'anonymous cursor sort_name is derived from alias ordering values'
);
select ok(
  (
    select position('zeta foreign alpha' in lower(response::text)) = 0
    from anon_page_one
  ),
  'anonymous payload excludes foreign normalized real names from JSON and cursor data'
);
select ok(
  (
    select position('7b000000-0000-4000-8000-000000000002' in lower(response::text)) = 0
    from anon_page_one
  ),
  'anonymous serialized payload never exposes foreign membership ids'
);
select ok(
  (
    select response->'next_cursor'->>'row_id' <> '7b000000-0000-4000-8000-000000000002'
    from anon_page_one
  ),
  'anonymous cursor row_id is never the foreign membership id'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table anon_page_two (response jsonb);
select lives_ok(
  $$
    insert into anon_page_two
    select public.get_group_leaderboard(
      '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
      'all_time',
      (select (response->'next_cursor'->>'rank')::integer from anon_page_one),
      (select response->'next_cursor'->>'sort_name' from anon_page_one),
      (select (response->'next_cursor'->>'row_id')::uuid from anon_page_one),
      2
    )
  $$,
  'next page requests accept rank/sort_name/row_id cursor payloads'
);
reset role;
select is(
  (select response->'items'->0->>'row_id' from anon_page_two),
  (
    select alias_key::text
    from aliases_after_enable
    where id = '7b000000-0000-4000-8000-000000000003'
  ),
  'cursor pagination does not skip the first row of the next page'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table toggle_enable_idempotent (response jsonb);
select lives_ok(
  $$ insert into toggle_enable_idempotent select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 2) $$,
  'repeating enable with the same target state is accepted'
);
reset role;
select is(
  (select (response->'group'->>'revision')::integer from toggle_enable_idempotent),
  2,
  'idempotent same-state enable keeps the revision unchanged'
);
select results_eq(
  $$
    select count(*)
    from aliases_after_enable expected
    join public.group_memberships current on current.id = expected.id
    where current.alias_normalized is distinct from expected.alias_normalized
  $$,
  array[0::bigint],
  'idempotent same-state enable never rotates aliases'
);
select results_eq(
  $$
    select count(*)
    from aliases_after_enable expected
    join public.group_memberships current on current.id = expected.id
    where current.alias_key is distinct from expected.alias_key
  $$,
  array[0::bigint],
  'idempotent same-state enable never rotates opaque row keys'
);
select is(
  (
    select (current.alias_epoch is not distinct from expected.alias_epoch)::text
    from group_after_enable expected
    cross join public.groups current
    where current.id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  ),
  'true',
  'idempotent same-state enable keeps the alias epoch unchanged'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table toggle_disable (response jsonb);
select lives_ok(
  $$ insert into toggle_disable select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', false, 2) $$,
  'owners can disable leaderboard anonymity with the current revision'
);
select is(
  (select (response->'group'->>'revision')::integer from toggle_disable),
  3,
  'disabling anonymity increments revision exactly once'
);

reset role;
create temp table aliases_after_disable as
select id, alias_name, alias_normalized, alias_key
from public.group_memberships
where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  and left_at is null
order by joined_at, id;
create temp table group_after_disable as
select alias_epoch
from public.groups
where id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70';

select results_eq(
  $$
    select count(*)
    from aliases_after_enable after_enable
    join aliases_after_disable after_disable using (id)
    where after_enable.alias_normalized is distinct from after_disable.alias_normalized
  $$,
  array[0::bigint],
  'disabling anonymity does not rotate aliases'
);
select results_eq(
  $$
    select count(*)
    from aliases_after_enable after_enable
    join aliases_after_disable after_disable using (id)
    where after_enable.alias_key is distinct from after_disable.alias_key
  $$,
  array[0::bigint],
  'disabling anonymity does not rotate opaque row keys'
);
select is(
  (
    select (after_disable.alias_epoch is not distinct from after_enable.alias_epoch)::text
    from group_after_enable after_enable
    cross join group_after_disable after_disable
  ),
  'true',
  'disabling anonymity does not rotate the alias epoch'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table named_after_disable as
select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'all_time', null, null, null, 20) as response;

reset role;
select is(
  (
    select item->>'display_name'
    from named_after_disable,
    lateral jsonb_array_elements(response->'items') item
    where item->>'row_id' = '7b000000-0000-4000-8000-000000000002'
  ),
  'Zeta Foreign Alpha',
  'named mode restores foreign real display names after disabling anonymity'
);
select is(
  (
    select item->>'row_id'
    from named_after_disable,
    lateral jsonb_array_elements(response->'items') item
    where item->>'display_name' = 'Zeta Foreign Alpha'
  ),
  '7b000000-0000-4000-8000-000000000002',
  'named mode row_id returns to membership id values'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table toggle_disable_idempotent (response jsonb);
select lives_ok(
  $$ insert into toggle_disable_idempotent select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', false, 3) $$,
  'repeating disable with the same target state is accepted'
);
reset role;
select is(
  (select (response->'group'->>'revision')::integer from toggle_disable_idempotent),
  3,
  'idempotent same-state disable keeps the revision unchanged'
);
select results_eq(
  $$
    select count(*)
    from aliases_after_disable expected
    join public.group_memberships current on current.id = expected.id
    where current.alias_normalized is distinct from expected.alias_normalized
  $$,
  array[0::bigint],
  'idempotent same-state disable never rotates aliases'
);
select results_eq(
  $$
    select count(*)
    from aliases_after_disable expected
    join public.group_memberships current on current.id = expected.id
    where current.alias_key is distinct from expected.alias_key
  $$,
  array[0::bigint],
  'idempotent same-state disable never rotates opaque row keys'
);
select is(
  (
    select (current.alias_epoch is not distinct from expected.alias_epoch)::text
    from group_after_disable expected
    cross join public.groups current
    where current.id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  ),
  'true',
  'idempotent same-state disable keeps the alias epoch unchanged'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table toggle_enable_second (response jsonb);
select lives_ok(
  $$ insert into toggle_enable_second select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 3) $$,
  're-enabling anonymity rotates to a fresh anonymous epoch'
);
select is(
  (select (response->'group'->>'revision')::integer from toggle_enable_second),
  4,
  'second enable increments revision exactly once'
);

reset role;
create temp table aliases_after_second_enable as
select id, alias_name, alias_normalized, alias_key
from public.group_memberships
where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  and left_at is null
order by joined_at, id;
create temp table group_after_second_enable as
select alias_epoch
from public.groups
where id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70';

select is(
  (
    select (second_enable.alias_epoch is distinct from first_enable.alias_epoch)::text
    from group_after_enable first_enable
    cross join group_after_second_enable second_enable
  ),
  'true',
  'each false->true transition rotates to a fresh alias epoch'
);
select results_eq(
  $$
    select count(*)
    from aliases_after_enable first_enable
    join aliases_after_second_enable second_enable using (id)
    where first_enable.alias_normalized is distinct from second_enable.alias_normalized
  $$,
  array[5::bigint],
  'second false->true transition rotates aliases for every active membership'
);
select results_eq(
  $$
    select count(*)
    from aliases_after_enable first_enable
    join aliases_after_second_enable second_enable using (id)
    where first_enable.alias_key is distinct from second_enable.alias_key
  $$,
  array[5::bigint],
  'second false->true transition rotates opaque row keys for every active membership'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table anon_after_second_enable as
select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'all_time', null, null, null, 20) as response;

reset role;
select ok(
  (
    (
      select second_row.item->>'row_id'
      from anon_after_second_enable second_board,
      lateral jsonb_array_elements(second_board.response->'items') as second_row(item)
      where second_row.item->>'display_name' = (
        select alias_name
        from aliases_after_second_enable
        where id = '7b000000-0000-4000-8000-000000000002'
      )
    )
    is distinct from
    (
      select first_row.item->>'row_id'
      from anon_page_one first_board,
      lateral jsonb_array_elements(first_board.response->'items') as first_row(item)
      where first_row.item->>'display_name' = (
        select alias_name
        from aliases_after_enable
        where id = '7b000000-0000-4000-8000-000000000002'
      )
    )
  ),
  'foreign row_id changes across named->anonymous and subsequent anonymous rotations'
);

select results_eq(
  $$
    with adjectives as (
      select word, ordinality
      from unnest(array[
        'Ruhiger', 'Klarer', 'Sanfter', 'Stiller',
        'Heller', 'Milder', 'Wacher', 'Leiser',
        'Freier', 'Sicherer', 'Feiner', 'Weiter',
        'Tiefer', 'Fester', 'Warmer', 'Harmonischer'
      ]::text[]) with ordinality as adjective(word, ordinality)
    ), nouns as (
      select word, ordinality
      from unnest(array[
        'Garten', 'Morgen', 'Fluss', 'Pfad',
        'Stern', 'Berg', 'Wald', 'Hafen',
        'Stein', 'Wind', 'Tal', 'Zweig',
        'Ufer', 'Weg', 'Licht', 'Feld'
      ]::text[]) with ordinality as noun(word, ordinality)
    ), first_aliases as (
      select
        before_rotation.id,
        ((adjective.ordinality - 1) + ((noun.ordinality - 1) * 16))::integer as combo_index
      from aliases_after_enable before_rotation
      join adjectives adjective on adjective.word = split_part(before_rotation.alias_name, ' ', 1)
      join nouns noun on noun.word = split_part(before_rotation.alias_name, ' ', 2)
    ), second_aliases as (
      select
        after_rotation.id,
        ((adjective.ordinality - 1) + ((noun.ordinality - 1) * 16))::integer as combo_index
      from aliases_after_second_enable after_rotation
      join adjectives adjective on adjective.word = split_part(after_rotation.alias_name, ' ', 1)
      join nouns noun on noun.word = split_part(after_rotation.alias_name, ' ', 2)
    )
    select (count(distinct mod((second_aliases.combo_index - first_aliases.combo_index + 256), 256)) > 1)::boolean
    from first_aliases
    join second_aliases using (id)
  $$,
  array[true],
  'alias transitions are not a uniform index shift across fixture members'
);

insert into public.group_memberships (id, group_id, user_id, joined_at, sharing_consent_version)
values (
  '7b000000-0000-4000-8000-000000000008',
  '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70',
  '71000000-0000-4000-8000-000000000008',
  clock_timestamp(),
  'mvp08-leaderboard-v1'
);

select results_eq(
  $$
    select (
      membership.alias_name is not null
      and membership.alias_normalized = pg_catalog.lower(private.normalise_name(membership.alias_name))
      and membership.alias_key is not null
    )::boolean
    from public.group_memberships membership
    where membership.id = '7b000000-0000-4000-8000-000000000008'
  $$,
  array[true],
  'new active members created during anonymous mode receive non-null alias and opaque row key'
);
select results_eq(
  $$
    select (count(*) = count(distinct alias_key))::boolean
    from public.group_memberships
    where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
      and left_at is null
  $$,
  array[true],
  'new active membership row keys remain unique in the current epoch'
);
select is(
  (
    select alias_normalized
    from public.group_memberships
    where id = '7b000000-0000-4000-8000-000000000008'
  ),
  (
    with current_epoch as (
      select alias_epoch
      from public.groups
      where id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
    ), occupied_aliases as (
      select alias_normalized
      from public.group_memberships
      where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
        and left_at is null
        and id <> '7b000000-0000-4000-8000-000000000008'
    )
    select candidate.alias_normalized
    from current_epoch
    cross join generate_series(0, 1024) attempt
    cross join lateral private.membership_alias_candidate_for_epoch(
      '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'::uuid,
      '7b000000-0000-4000-8000-000000000008'::uuid,
      current_epoch.alias_epoch,
      attempt
    ) candidate
    where not exists (
      select 1
      from occupied_aliases
      where occupied_aliases.alias_normalized = candidate.alias_normalized
    )
    order by attempt
    limit 1
  ),
  'new members derive aliases from the current alias epoch'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
create temp table anon_after_join as
select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'all_time', null, null, null, 20) as response;

reset role;
select is(
  (
    select item->>'row_id'
    from anon_after_join,
    lateral jsonb_array_elements(response->'items') item
    where item->>'display_name' = (
      select alias_name
      from public.group_memberships
      where id = '7b000000-0000-4000-8000-000000000008'
    )
  ),
  (
    select alias_key::text
    from public.group_memberships
    where id = '7b000000-0000-4000-8000-000000000008'
  ),
  'anonymous leaderboard exposes current-epoch joiners via alias row_id keys'
);

update public.groups
set status = 'suspended'
where id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70';

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 4) $$,
  'P0001',
  'NOT_FOUND',
  'suspended groups reject owner anonymity toggles with a neutral NOT_FOUND'
);
select throws_ok(
  $$ select public.get_group_leaderboard('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', 'week') $$,
  'P0001',
  'NOT_FOUND',
  'suspended groups are inaccessible to leaderboard reads'
);

reset role;
select * from finish();
rollback;
