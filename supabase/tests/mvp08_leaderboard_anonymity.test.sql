begin;

create extension if not exists pgtap with schema extensions;
select plan(40);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'mvp08-leaderboard-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'mvp08-leaderboard-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'mvp08-leaderboard-b@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'mvp08-leaderboard-c@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'mvp08-leaderboard-d@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'mvp08-leaderboard-outsider@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'mvp08-leaderboard-historical@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('71000000-0000-4000-8000-000000000001', 'Owner Real', 'owner real'),
  ('71000000-0000-4000-8000-000000000002', 'Zeta Foreign Alpha', 'zeta foreign alpha'),
  ('71000000-0000-4000-8000-000000000003', 'Zeta Foreign Beta', 'zeta foreign beta'),
  ('71000000-0000-4000-8000-000000000004', 'Zeta Foreign Gamma', 'zeta foreign gamma'),
  ('71000000-0000-4000-8000-000000000005', 'Late Joiner', 'late joiner'),
  ('71000000-0000-4000-8000-000000000006', 'Outside Viewer', 'outside viewer'),
  ('71000000-0000-4000-8000-000000000007', 'Former Member', 'former member');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('71000000-0000-4000-8000-000000000001', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000002', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000003', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000004', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000005', 'core_processing', 'mvp-core-v1', 'de'),
  ('71000000-0000-4000-8000-000000000006', 'core_processing', 'mvp-core-v1', 'en');

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
select id, alias_name, alias_normalized
from public.group_memberships
where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  and left_at is null
order by joined_at, id;

select has_function(
  'public',
  'set_group_leaderboard_anonymity',
  'leaderboard anonymity toggle RPC exists'
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
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000001'
  ),
  'Owner Real',
  'named leaderboard keeps the caller display name visible'
);
select is(
  (
    select item->>'display_name'
    from named_week,
    lateral jsonb_array_elements(response->'items') item
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000002'
  ),
  'Zeta Foreign Alpha',
  'named leaderboard keeps foreign member real names'
);
select is(
  (
    select item->>'is_self'
    from named_week,
    lateral jsonb_array_elements(response->'items') item
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000001'
  ),
  'true',
  'named leaderboard marks the own row'
);
select is(
  (select response->>'own_alias' from named_week),
  null,
  'named leaderboard omits own_alias when anonymity is disabled'
);
select is(
  (
    select (item->>'total')::bigint
    from named_week,
    lateral jsonb_array_elements(response->'items') item
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000005'
  ),
  22::bigint,
  'weekly leaderboard excludes pre-join values and out-of-week values'
);
select is(
  (
    select (item->>'total')::bigint
    from named_all_time,
    lateral jsonb_array_elements(response->'items') item
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000005'
  ),
  55::bigint,
  'all-time leaderboard keeps post-join values while excluding pre-join values'
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

set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 2) $$,
  'P0001',
  'ENTRY_VERSION_CONFLICT',
  'stale group revisions are rejected by the anonymity toggle'
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
select id, alias_name, alias_normalized
from public.group_memberships
where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  and left_at is null
order by joined_at, id;

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
    select (count(*) = count(distinct alias_normalized))::boolean
    from aliases_after_enable
  $$,
  array[true],
  'rotated aliases remain unique among active memberships'
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
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000001'
  ),
  'Owner Real',
  'anonymous leaderboard keeps the caller real display name'
);
select is(
  (
    select item->>'is_self'
    from anon_page_one,
    lateral jsonb_array_elements(response->'items') item
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000001'
  ),
  'true',
  'anonymous leaderboard marks the own row as is_self=true'
);
select is(
  (
    select item->>'display_name'
    from anon_page_one,
    lateral jsonb_array_elements(response->'items') item
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000002'
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
    select response->'next_cursor' ? 'sort_name'
      and not (response->'next_cursor' ? 'normalized_name')
    from anon_page_one
  ),
  'anonymous cursor uses neutral sort_name key and omits normalized_name'
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
      (select (response->'next_cursor'->>'membership_id')::uuid from anon_page_one),
      2
    )
  $$,
  'next page requests accept rank/sort_name/membership_id cursor payloads'
);
reset role;
select is(
  (select response->'items'->0->>'membership_id' from anon_page_two),
  '7b000000-0000-4000-8000-000000000003',
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
select id, alias_name, alias_normalized
from public.group_memberships
where group_id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70'
  and left_at is null
order by joined_at, id;

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
    where item->>'membership_id' = '7b000000-0000-4000-8000-000000000002'
  ),
  'Zeta Foreign Alpha',
  'named mode restores foreign real display names after disabling anonymity'
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

reset role;
update public.groups
set status = 'suspended'
where id = '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70';

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';
select throws_ok(
  $$ select public.set_group_leaderboard_anonymity('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a70', true, 3) $$,
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
