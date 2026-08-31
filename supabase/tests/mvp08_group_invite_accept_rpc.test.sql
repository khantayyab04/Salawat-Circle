begin;

create extension if not exists pgtap with schema extensions;
select plan(51);

select has_function(
  'public',
  'preview_group_invite',
  array['text', 'text'],
  'invite preview RPC exists'
);
select has_function(
  'public',
  'accept_group_invite',
  array['text', 'text', 'text'],
  'invite accept RPC exists'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
    where procedure.oid = 'public.preview_group_invite(text, text)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute invite preview RPC'
);
select is(
  pg_catalog.has_function_privilege('anon', 'public.preview_group_invite(text, text)', 'EXECUTE'),
  false,
  'anonymous clients cannot execute invite preview RPC'
);
select is(
  pg_catalog.has_function_privilege('authenticated', 'public.preview_group_invite(text, text)', 'EXECUTE'),
  true,
  'authenticated clients can execute invite preview RPC'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
    where procedure.oid = 'public.accept_group_invite(text, text, text)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute invite accept RPC'
);
select is(
  pg_catalog.has_function_privilege('anon', 'public.accept_group_invite(text, text, text)', 'EXECUTE'),
  false,
  'anonymous clients cannot execute invite accept RPC'
);
select is(
  pg_catalog.has_function_privilege('authenticated', 'public.accept_group_invite(text, text, text)', 'EXECUTE'),
  true,
  'authenticated clients can execute invite accept RPC'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'mvp08-task5-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'mvp08-task5-joiner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'mvp08-task5-existing@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'mvp08-task5-no-consent@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'mvp08-task5-cap@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'mvp08-task5-full@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '77777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'mvp08-task5-rejoin@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated', 'mvp08-task5-retro@example.test', '', now(), now(), now());

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  ('90000000-0000-4000-8000-' || lpad(seed::text, 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  'mvp08-task5-fill-' || seed || '@example.test',
  '',
  now(),
  now(),
  now()
from generate_series(1, 499) as seed;

insert into public.profiles (id, display_name, normalized_name)
values
  ('11111111-1111-4111-8111-111111111111', 'Task5 Owner', 'task5 owner'),
  ('22222222-2222-4222-8222-222222222222', 'Task5 Joiner', 'task5 joiner'),
  ('33333333-3333-4333-8333-333333333333', 'Task5 Existing', 'task5 existing'),
  ('44444444-4444-4444-8444-444444444444', 'Task5 No Consent', 'task5 no consent'),
  ('55555555-5555-4555-8555-555555555555', 'Task5 Cap', 'task5 cap'),
  ('66666666-6666-4666-8666-666666666666', 'Task5 Full', 'task5 full'),
  ('77777777-7777-4777-8777-777777777777', 'Task5 Rejoin', 'task5 rejoin'),
  ('88888888-8888-4888-8888-888888888888', 'Task5 Retro', 'task5 retro');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('11111111-1111-4111-8111-111111111111', 'core_processing', 'mvp-core-v1', 'de'),
  ('22222222-2222-4222-8222-222222222222', 'core_processing', 'mvp-core-v1', 'de'),
  ('33333333-3333-4333-8333-333333333333', 'core_processing', 'mvp-core-v1', 'de'),
  ('55555555-5555-4555-8555-555555555555', 'core_processing', 'mvp-core-v1', 'en'),
  ('66666666-6666-4666-8666-666666666666', 'core_processing', 'mvp-core-v1', 'en'),
  ('77777777-7777-4777-8777-777777777777', 'core_processing', 'mvp-core-v1', 'de'),
  ('88888888-8888-4888-8888-888888888888', 'core_processing', 'mvp-core-v1', 'en');

insert into public.groups (id, owner_user_id, name, normalized_name, timezone, status, leaderboard_anonymous)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Task5 Active Group', 'task5 active group', 'Europe/Berlin', 'active', true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'Task5 Suspended Group', 'task5 suspended group', 'Europe/Berlin', 'suspended', false),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', 'Task5 Full Group', 'task5 full group', 'Europe/Berlin', 'active', false),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '11111111-1111-4111-8111-111111111111', 'Task5 Cap Target Group', 'task5 cap target group', 'Europe/Berlin', 'active', false),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '11111111-1111-4111-8111-111111111111', 'Task5 Retro Group', 'task5 retro group', 'Europe/Berlin', 'active', false);

insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
select
  ('60000000-0000-4000-8000-' || lpad(seed::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111',
  'Task5 Cap Seed Group ' || seed,
  lower('Task5 Cap Seed Group ' || seed),
  'Europe/Berlin'
from generate_series(1, 50) as seed;

insert into public.group_memberships (id, group_id, user_id, joined_at, left_at, sharing_consent_version)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', now(), null, 'mvp08-owner-v1'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '33333333-3333-4333-8333-333333333333', now(), null, 'mvp08-existing-v1'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', now(), null, 'mvp08-owner-v1'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '11111111-1111-4111-8111-111111111111', now(), null, 'mvp08-owner-v1'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '11111111-1111-4111-8111-111111111111', now(), null, 'mvp08-owner-v1'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '77777777-7777-4777-8777-777777777777', now() - interval '2 days', now() - interval '1 day', 'mvp08-old-v1');

insert into public.group_memberships (group_id, user_id, sharing_consent_version)
select
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  ('90000000-0000-4000-8000-' || lpad(seed::text, 12, '0'))::uuid,
  'mvp08-fill-v1'
from generate_series(1, 499) as seed;

insert into public.group_memberships (group_id, user_id, sharing_consent_version)
select
  ('60000000-0000-4000-8000-' || lpad(seed::text, 12, '0'))::uuid,
  '55555555-5555-4555-8555-555555555555',
  'mvp08-cap-v1'
from generate_series(1, 50) as seed;

insert into private.group_invites (
  id,
  group_id,
  created_by,
  token_hash,
  code_hash,
  expires_at,
  max_uses,
  use_count,
  created_at
)
values
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('A', 43)), private.group_invite_code_hash('ABCD2345EF'), now() + interval '2 days', 5, 0, now() - interval '2 hours'),
  ('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('B', 43)), private.group_invite_code_hash('BCDE2345FG'), now() - interval '1 minute', 5, 0, now() - interval '2 days'),
  ('cccccccc-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('C', 43)), private.group_invite_code_hash('CDEF2345GH'), now() + interval '2 days', 5, 0, now() - interval '2 days'),
  ('cccccccc-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('D', 43)), private.group_invite_code_hash('DEFG2345HJ'), now() + interval '2 days', 2, 2, now() - interval '2 days'),
  ('cccccccc-0000-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('E', 43)), private.group_invite_code_hash('EFGH2345JK'), now() + interval '2 days', 5, 0, now() - interval '2 days'),
  ('cccccccc-0000-4000-8000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('F', 43)), private.group_invite_code_hash('FGHJ2345KM'), now() + interval '2 days', 5, 0, now() - interval '2 days'),
  ('cccccccc-0000-4000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('G', 43)), private.group_invite_code_hash('GHJK2345MN'), now() + interval '2 days', 5, 0, now() - interval '2 days'),
  ('cccccccc-0000-4000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('H', 43)), private.group_invite_code_hash('HJKM2345NP'), now() + interval '2 days', 5, 0, now() - interval '2 days'),
  ('cccccccc-0000-4000-8000-000000000009', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '11111111-1111-4111-8111-111111111111', private.group_invite_token_hash(repeat('J', 43)), private.group_invite_code_hash('JKMN2345PR'), now() + interval '2 days', 5, 0, now() - interval '2 days');

update private.group_invites
set revoked_at = now() - interval '5 minutes'
where id = 'cccccccc-0000-4000-8000-000000000003';

set local role anon;
select throws_ok(
  $$ select public.preview_group_invite('token', repeat('A', 43)) $$,
  '42501',
  null,
  'anonymous clients cannot call invite preview RPC'
);
select throws_ok(
  $$ select public.accept_group_invite('token', repeat('A', 43), 'de') $$,
  '42501',
  null,
  'anonymous clients cannot call invite accept RPC'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';

create temp table preview_token as
select public.preview_group_invite('token', repeat('A', 43)) as response;

select ok(
  (select response ?& array['group', 'already_active', 'request_id', 'server_time'] from preview_token),
  'invite preview returns envelope and join metadata'
);
select ok(
  (
    select
      response->'group' ?& array['id', 'name', 'timezone', 'leaderboard_anonymous', 'member_count']
      and (select count(*) from jsonb_object_keys(response->'group')) = 5
    from preview_token
  ),
  'invite preview exposes only safe group metadata fields'
);
select ok(
  (
    select not (response ?| array['token', 'code', 'token_hash', 'code_hash'])
    from preview_token
  ),
  'invite preview never exposes invite secrets or hashes'
);
select is(
  (select (response->>'already_active')::boolean from preview_token),
  false,
  'preview marks non-member callers as not yet active'
);

create temp table preview_code as
select public.preview_group_invite('code', 'ABCD2345EF') as response;

select is(
  (select response->'group'->>'id' from preview_code),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'preview accepts manual invite codes with the same contract'
);

set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
create temp table preview_existing as
select public.preview_group_invite('token', repeat('A', 43)) as response;
select is(
  (select (response->>'already_active')::boolean from preview_existing),
  true,
  'preview reports when caller already has an active membership'
);

set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select throws_ok(
  $$ select public.preview_group_invite('magic', repeat('A', 43)) $$,
  'P0001',
  'INVALID_INPUT',
  'preview rejects unsupported invite kinds'
);
select throws_ok(
  $$ select public.preview_group_invite('token', 'bad-secret') $$,
  'P0001',
  'INVITE_INVALID',
  'preview maps malformed invite secret input to neutral invite invalid response'
);
select throws_ok(
  $$ select public.preview_group_invite('token', repeat('Z', 43)) $$,
  'P0001',
  'INVITE_INVALID',
  'preview maps unknown invite tokens to neutral invite invalid response'
);
select throws_ok(
  $$ select public.preview_group_invite('token', repeat('B', 43)) $$,
  'P0001',
  'INVITE_INVALID',
  'preview treats expired invites as neutral invalid'
);
select throws_ok(
  $$ select public.preview_group_invite('token', repeat('C', 43)) $$,
  'P0001',
  'INVITE_INVALID',
  'preview treats revoked invites as neutral invalid'
);
select throws_ok(
  $$ select public.preview_group_invite('token', repeat('D', 43)) $$,
  'P0001',
  'INVITE_INVALID',
  'preview treats exhausted invites as neutral invalid'
);
select throws_ok(
  $$ select public.preview_group_invite('token', repeat('E', 43)) $$,
  'P0001',
  'INVITE_INVALID',
  'preview treats invites for suspended groups as neutral invalid'
);

set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
select throws_ok(
  $$ select public.preview_group_invite('token', repeat('A', 43)) $$,
  'P0001',
  'CONSENT_REQUIRED',
  'preview requires active core consent before revealing group details'
);

set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select throws_ok(
  $$ select public.accept_group_invite('magic', repeat('A', 43), 'de') $$,
  'P0001',
  'INVALID_INPUT',
  'accept rejects unsupported invite kinds'
);
select throws_ok(
  $$ select public.accept_group_invite('token', 'bad-secret', 'de') $$,
  'P0001',
  'INVITE_INVALID',
  'accept maps malformed invite secret input to neutral invite invalid response'
);
select throws_ok(
  $$ select public.accept_group_invite('token', repeat('Z', 43), 'de') $$,
  'P0001',
  'INVITE_INVALID',
  'accept maps unknown invite tokens to neutral invite invalid response'
);
select throws_ok(
  $$ select public.accept_group_invite('token', repeat('B', 43), 'de') $$,
  'P0001',
  'INVITE_INVALID',
  'accept treats expired invites as neutral invalid'
);
select throws_ok(
  $$ select public.accept_group_invite('token', repeat('C', 43), 'de') $$,
  'P0001',
  'INVITE_INVALID',
  'accept treats revoked invites as neutral invalid'
);
select throws_ok(
  $$ select public.accept_group_invite('token', repeat('D', 43), 'de') $$,
  'P0001',
  'INVITE_INVALID',
  'accept treats exhausted invites as neutral invalid'
);
select throws_ok(
  $$ select public.accept_group_invite('token', repeat('E', 43), 'de') $$,
  'P0001',
  'INVITE_INVALID',
  'accept treats invites for suspended groups as neutral invalid'
);

set local "request.jwt.claim.sub" = '66666666-6666-4666-8666-666666666666';
select throws_ok(
  $$ select public.accept_group_invite('token', repeat('F', 43), 'en') $$,
  'P0001',
  'INVITE_INVALID',
  'accept rejects joins when the invited group is already at active member capacity'
);

set local "request.jwt.claim.sub" = '55555555-5555-4555-8555-555555555555';
select throws_ok(
  $$ select public.accept_group_invite('token', repeat('G', 43), 'en') $$,
  'P0001',
  'INVITE_INVALID',
  'accept rejects joins when account already has fifty active groups'
);

set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
create temp table accepted_joiner as
select public.accept_group_invite('token', repeat('A', 43), 'de') as response;

select ok(
  (select response ?& array['group', 'membership', 'already_active', 'request_id', 'server_time'] from accepted_joiner),
  'accept response returns envelope and group/member payload'
);
select ok(
  (
    select
      response->'group' ?& array['id', 'name', 'timezone', 'leaderboard_anonymous', 'member_count']
      and (select count(*) from jsonb_object_keys(response->'group')) = 5
    from accepted_joiner
  ),
  'accept response includes only safe group metadata fields'
);
select ok(
  (
    select response->'membership' ?& array['id', 'group_id', 'joined_at', 'created_at', 'sharing_consent_version']
    from accepted_joiner
  ),
  'accept response includes safe membership metadata fields'
);
select is(
  (select (response->>'already_active')::boolean from accepted_joiner),
  false,
  'accept marks first successful join as not already active'
);
select results_eq(
  $$
    select
      membership.invite_id = 'cccccccc-0000-4000-8000-000000000001'::uuid
      and membership.sharing_consent_version = 'mvp08-group-sharing-v1'
      and membership.left_at is null
    from public.group_memberships membership
    join accepted_joiner payload
      on membership.id = (payload.response->'membership'->>'id')::uuid
  $$,
  array[true],
  'accept stores invite-backed active membership with immutable sharing consent version'
);

reset role;

select results_eq(
  $$
    select count(*)
    from private.consent_records
    where user_id = '22222222-2222-4222-8222-222222222222'
      and consent_type = 'group_sharing'
      and document_version = 'mvp08-group-sharing-v1'
      and locale = 'de'
      and withdrawn_at is null
  $$,
  array[1::bigint],
  'accept records immutable group-sharing consent with supplied locale'
);
select results_eq(
  $$
    select count(*)
    from private.group_invite_uses
    where invite_id = 'cccccccc-0000-4000-8000-000000000001'
      and user_id = '22222222-2222-4222-8222-222222222222'
  $$,
  array[1::bigint],
  'accept records one invite-use row for the first successful join'
);
select results_eq(
  $$
    select use_count
    from private.group_invites
    where id = 'cccccccc-0000-4000-8000-000000000001'
  $$,
  array[1],
  'accept increments invite use_count exactly once on first successful join'
);
select results_eq(
  $$
    select (membership.alias_name is not null and membership.alias_normalized is not null)::boolean
    from public.group_memberships membership
    join accepted_joiner payload
      on membership.id = (payload.response->'membership'->>'id')::uuid
  $$,
  array[true],
  'accept relies on alias trigger so new active members receive aliases'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
create temp table accepted_joiner_repeat as
select public.accept_group_invite('token', repeat('A', 43), 'en') as response;
select is(
  (select response->'membership'->>'id' from accepted_joiner_repeat),
  (select response->'membership'->>'id' from accepted_joiner),
  'accept is idempotent for an already-active membership and returns the same membership id'
);

reset role;

select results_eq(
  $$
    select use_count
    from private.group_invites
    where id = 'cccccccc-0000-4000-8000-000000000001'
  $$,
  array[1],
  'idempotent repeat acceptance does not increment invite use_count'
);
select results_eq(
  $$
    select count(*)
    from private.group_invite_uses
    where invite_id = 'cccccccc-0000-4000-8000-000000000001'
      and user_id = '22222222-2222-4222-8222-222222222222'
  $$,
  array[1::bigint],
  'idempotent repeat acceptance does not duplicate invite use records'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
create temp table accepted_existing as
select public.accept_group_invite('token', repeat('A', 43), 'de') as response;
select is(
  (select response->'membership'->>'id' from accepted_existing),
  'bbbbbbbb-0000-4000-8000-000000000002',
  'accept returns existing active membership id for callers already in the group'
);

reset role;

select results_eq(
  $$
    select use_count
    from private.group_invites
    where id = 'cccccccc-0000-4000-8000-000000000001'
  $$,
  array[1],
  'existing active memberships do not consume additional invite uses'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '77777777-7777-4777-8777-777777777777';
create temp table accepted_rejoin as
select public.accept_group_invite('code', 'HJKM2345NP', 'de') as response;
select ok(
  (
    select
      (payload.response->'membership'->>'id')::uuid <> 'bbbbbbbb-0000-4000-8000-000000000006'::uuid
      and historical.left_at is not null
    from accepted_rejoin payload
    join public.group_memberships historical
      on historical.id = 'bbbbbbbb-0000-4000-8000-000000000006'::uuid
  ),
  'accept inserts a new membership period and never reactivates historical membership rows'
);

set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '88888888-8888-4888-8888-888888888888';
create temp table accepted_retro as
select public.accept_group_invite('token', repeat('J', 43), 'en') as response;

reset role;

insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client)
select
  'dddddddd-0000-4000-8000-000000000001'::uuid,
  '88888888-8888-4888-8888-888888888888'::uuid,
  40,
  current_date,
  'Europe/Berlin',
  ((response->'membership'->>'joined_at')::timestamptz - interval '1 minute')
from accepted_retro;

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '88888888-8888-4888-8888-888888888888';
create temp table retro_board_before as
select public.get_group_leaderboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'week') as response;

select is(
  (
    select (item->>'total')::bigint
    from retro_board_before,
    lateral jsonb_array_elements(response->'items') as item
    where item->>'membership_id' = (select response->'membership'->>'id' from accepted_retro)
  ),
  0::bigint,
  'leaderboard excludes entries recorded before joined_at for invite acceptances'
);

reset role;

insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client)
select
  'dddddddd-0000-4000-8000-000000000002'::uuid,
  '88888888-8888-4888-8888-888888888888'::uuid,
  60,
  current_date,
  'Europe/Berlin',
  ((response->'membership'->>'joined_at')::timestamptz + interval '1 minute')
from accepted_retro;

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '88888888-8888-4888-8888-888888888888';
create temp table retro_board_after as
select public.get_group_leaderboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'week') as response;

select is(
  (
    select (item->>'total')::bigint
    from retro_board_after,
    lateral jsonb_array_elements(response->'items') as item
    where item->>'membership_id' = (select response->'membership'->>'id' from accepted_retro)
  ),
  60::bigint,
  'leaderboard includes entries recorded after joined_at for invite acceptances'
);

reset role;
select ok(
  position(
    'for update' in lower(pg_catalog.pg_get_functiondef('public.accept_group_invite(text, text, text)'::regprocedure))
  ) > 0,
  'accept implementation locks invite rows FOR UPDATE for concurrent safety'
);

select * from finish();
rollback;
