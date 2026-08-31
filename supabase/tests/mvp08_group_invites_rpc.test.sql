begin;

create extension if not exists pgtap with schema extensions;
select plan(39);

select has_function(
  'public',
  'create_group_invite',
  array['uuid', 'integer', 'integer'],
  'group invite creation RPC exists'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
    where procedure.oid = 'public.create_group_invite(uuid, integer, integer)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute the invite creation RPC'
);
select is(
  pg_catalog.has_function_privilege('anon', 'public.create_group_invite(uuid, integer, integer)', 'EXECUTE'),
  false,
  'anonymous clients cannot execute the invite creation RPC'
);
select is(
  pg_catalog.has_function_privilege('authenticated', 'public.create_group_invite(uuid, integer, integer)', 'EXECUTE'),
  true,
  'authenticated clients can execute the invite creation RPC'
);
select has_function(
  'public',
  'list_group_invites',
  array['uuid'],
  'group invite listing RPC exists'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
    where procedure.oid = 'public.list_group_invites(uuid)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute the invite listing RPC'
);
select is(
  pg_catalog.has_function_privilege('anon', 'public.list_group_invites(uuid)', 'EXECUTE'),
  false,
  'anonymous clients cannot execute the invite listing RPC'
);
select is(
  pg_catalog.has_function_privilege('authenticated', 'public.list_group_invites(uuid)', 'EXECUTE'),
  true,
  'authenticated clients can execute the invite listing RPC'
);
select has_function(
  'public',
  'revoke_group_invite',
  array['uuid', 'uuid'],
  'group invite revocation RPC exists'
);
select is(
  (
    select count(*)
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
    where procedure.oid = 'public.revoke_group_invite(uuid, uuid)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute the invite revocation RPC'
);
select is(
  pg_catalog.has_function_privilege('anon', 'public.revoke_group_invite(uuid, uuid)', 'EXECUTE'),
  false,
  'anonymous clients cannot execute the invite revocation RPC'
);
select is(
  pg_catalog.has_function_privilege('authenticated', 'public.revoke_group_invite(uuid, uuid)', 'EXECUTE'),
  true,
  'authenticated clients can execute the invite revocation RPC'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'mvp08-invite-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'mvp08-invite-member@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'mvp08-invite-no-consent@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('11111111-1111-4111-8111-111111111111', 'Invite Owner', 'invite owner'),
  ('22222222-2222-4222-8222-222222222222', 'Invite Member', 'invite member'),
  ('33333333-3333-4333-8333-333333333333', 'Invite No Consent', 'invite no consent');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('11111111-1111-4111-8111-111111111111', 'core_processing', 'mvp-core-v1', 'de'),
  ('22222222-2222-4222-8222-222222222222', 'core_processing', 'mvp-core-v1', 'de');

insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  'Invite Circle',
  'invite circle',
  'Europe/Berlin'
);

insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'mvp08-owner-v1'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222', 'mvp08-member-v1');

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

create temp table created_invite as
select public.create_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') as response;

select ok(
  (select response ?& array['invite', 'request_id', 'server_time'] from created_invite),
  'invite creation response includes envelope metadata'
);
select ok(
  (select response->'invite' ?& array['id', 'group_id', 'token', 'code', 'expires_at', 'max_uses', 'use_count', 'revoked_at', 'created_at'] from created_invite),
  'invite creation returns the new raw token and code once with metadata'
);
select ok(
  (select (response->'invite'->>'token') ~ '^[A-Za-z0-9_-]{43}$' from created_invite),
  'invite token is URL-safe base64 without padding from 32 random bytes'
);
select ok(
  (select (response->'invite'->>'code') ~ '^[A-HJKMNPQRSTUVWXYZ2-9]{10}$' from created_invite),
  'manual code is 10 uppercase chars without ambiguous symbols'
);
select is(
  (select (response->'invite'->>'max_uses')::integer from created_invite),
  25,
  'invite creation defaults max_uses to 25'
);
select ok(
  (
    select abs(extract(epoch from (
      (response->'invite'->>'expires_at')::timestamptz
      - (response->'invite'->>'created_at')::timestamptz
      - interval '7 days'
    ))) <= 5
    from created_invite
  ),
  'invite creation defaults expiry to seven days'
);
select throws_ok(
  $$ select public.create_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 31, 25) $$,
  'P0001',
  'INVALID_INPUT',
  'invite creation rejects an expiry beyond 30 days'
);
select throws_ok(
  $$ select public.create_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 7, 0) $$,
  'P0001',
  'INVALID_INPUT',
  'invite creation rejects max_uses lower than one'
);

create temp table created_invite_custom as
select public.create_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 30, 100) as response;

select is(
  (select (response->'invite'->>'max_uses')::integer from created_invite_custom),
  100,
  'invite creation accepts explicit max_uses up to 100'
);
select ok(
  (
    select abs(extract(epoch from (
      (response->'invite'->>'expires_at')::timestamptz
      - (response->'invite'->>'created_at')::timestamptz
      - interval '30 days'
    ))) <= 5
    from created_invite_custom
  ),
  'invite creation accepts explicit expiry up to thirty days'
);
select ok(
  (
    select
      first_invite.response->'invite'->>'token'
      <> second_invite.response->'invite'->>'token'
      and first_invite.response->'invite'->>'code'
      <> second_invite.response->'invite'->>'code'
    from created_invite first_invite, created_invite_custom second_invite
  ),
  'separate invite creations produce distinct raw token/code pairs'
);

reset role;
select results_eq(
  $$
    select (
      invite.token_hash = extensions.digest(payload.response->'invite'->>'token', 'sha256')
      and invite.code_hash = extensions.digest(payload.response->'invite'->>'code', 'sha256')
    )::boolean
    from private.group_invites invite
    join created_invite payload
      on invite.id = (payload.response->'invite'->>'id')::uuid
  $$,
  array[true],
  'database stores only token/code hashes matching the raw response values'
);

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
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  private.group_invite_token_hash('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
  private.group_invite_code_hash('MVP82QDE3A'),
  now() - interval '5 minutes',
  25,
  0,
  now() - interval '2 days'
), (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  private.group_invite_token_hash('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'),
  private.group_invite_code_hash('NWR93TSF4B'),
  now() + interval '5 minutes',
  2,
  2,
  now() - interval '2 days'
), (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  private.group_invite_token_hash('CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'),
  private.group_invite_code_hash('PXY74KGH5C'),
  now() + interval '5 minutes',
  25,
  1,
  now() - interval '2 days'
);

update private.group_invites
set revoked_at = now() - interval '1 minute'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';

create temp table listed_invites as
select public.list_group_invites('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') as response;

select ok(
  (select response ?& array['items', 'request_id', 'server_time'] from listed_invites),
  'invite listing response includes envelope metadata'
);
select ok(
  (
    select bool_and(
      item ?& array['id', 'group_id', 'expires_at', 'max_uses', 'use_count', 'revoked_at', 'created_at', 'status']
    )
    from listed_invites
    cross join lateral jsonb_array_elements(response->'items') as item
  ),
  'invite listing includes only the safe invite metadata contract'
);
select ok(
  (
    select bool_and(not (item ?| array['token', 'code', 'token_hash', 'code_hash']))
    from listed_invites
    cross join lateral jsonb_array_elements(response->'items') as item
  ),
  'invite listing never exposes raw secrets or hashes'
);
select ok(
  (
    select bool_and(
      (select count(*) from jsonb_object_keys(item)) = 8
    )
    from listed_invites
    cross join lateral jsonb_array_elements(response->'items') as item
  ),
  'invite listing does not expose extra metadata fields'
);
select results_eq(
  $$
    select item->>'status'
    from listed_invites
    cross join lateral jsonb_array_elements(response->'items') as item
    where (item->>'id')::uuid in (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'::uuid
    )
    order by item->>'id'
  $$,
  $$
    values ('expired'), ('exhausted'), ('revoked')
  $$,
  'invite listing derives expired/exhausted/revoked statuses from server state'
);
select is(
  (
    select item->>'status'
    from listed_invites
    cross join lateral jsonb_array_elements(response->'items') as item
    where (item->>'id')::uuid = (select (response->'invite'->>'id')::uuid from created_invite_custom)
  ),
  'active',
  'invite listing marks non-expired non-revoked invites with remaining uses as active'
);

create temp table revoked_invite_first as
select public.revoke_group_invite(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  (select (response->'invite'->>'id')::uuid from created_invite)
) as response;

select ok(
  (select response ?& array['invite', 'request_id', 'server_time'] from revoked_invite_first),
  'invite revocation response includes envelope metadata'
);
select ok(
  (select (response->'invite'->>'revoked_at')::timestamptz is not null from revoked_invite_first),
  'invite revocation sets a server-side revoked_at timestamp'
);

reset role;
select results_eq(
  $$
    select invite.revoked_at = (payload.response->'invite'->>'revoked_at')::timestamptz
    from private.group_invites invite
    join revoked_invite_first payload
      on invite.id = (payload.response->'invite'->>'id')::uuid
  $$,
  array[true],
  'invite revocation persists the same timestamp returned by the RPC'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
create temp table revoked_invite_second as
select public.revoke_group_invite(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  (select (response->'invite'->>'id')::uuid from created_invite)
) as response;

select is(
  (
    select response->'invite'->>'revoked_at'
    from revoked_invite_second
  ),
  (
    select response->'invite'->>'revoked_at'
    from revoked_invite_first
  ),
  'invite revocation is idempotent and keeps the initial revoke timestamp'
);
select throws_ok(
  $$ select public.revoke_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') $$,
  'P0001',
  'NOT_FOUND',
  'owners receive NOT_FOUND when revoking an unknown invite id'
);

set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select throws_ok(
  $$ select public.create_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') $$,
  'P0001',
  'NOT_FOUND',
  'non-owner members cannot create invites'
);

set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
select throws_ok(
  $$ select public.create_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') $$,
  'P0001',
  'CONSENT_REQUIRED',
  'invite creation requires an active core consent'
);
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select throws_ok(
  $$ select public.list_group_invites('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') $$,
  'P0001',
  'NOT_FOUND',
  'non-owner members cannot list invites'
);
select throws_ok(
  $$
    select public.revoke_group_invite(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      (select (response->'invite'->>'id')::uuid from created_invite)
    )
  $$,
  'P0001',
  'NOT_FOUND',
  'non-owner members cannot revoke invites'
);

reset role;
select * from finish();
rollback;
