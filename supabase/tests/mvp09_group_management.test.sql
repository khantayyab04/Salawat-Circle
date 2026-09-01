begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

select has_function(
  'public',
  'list_group_members',
  array['uuid', 'text', 'uuid', 'integer'],
  'member listing RPC exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '99000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'mvp09-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '99000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'mvp09-member@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '99000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'mvp09-outsider@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '99000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'mvp09-suspended@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '99000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'mvp09-spectator@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name, status)
values
  ('99000000-0000-4000-8000-000000000001', 'MVP09 Owner', 'mvp09 owner', 'active'),
  ('99000000-0000-4000-8000-000000000002', 'MVP09 Member', 'mvp09 member', 'active'),
  ('99000000-0000-4000-8000-000000000003', 'MVP09 Outsider', 'mvp09 outsider', 'active'),
  ('99000000-0000-4000-8000-000000000004', 'MVP09 Suspended', 'mvp09 suspended', 'suspended'),
  ('99000000-0000-4000-8000-000000000005', 'MVP09 Spectator', 'mvp09 spectator', 'active');

insert into public.user_settings (user_id, timezone, locale)
values
  ('99000000-0000-4000-8000-000000000001', 'Europe/Berlin', 'de'),
  ('99000000-0000-4000-8000-000000000002', 'Europe/Berlin', 'de'),
  ('99000000-0000-4000-8000-000000000003', 'Europe/Berlin', 'de');
insert into public.user_settings (user_id, timezone, locale)
values ('99000000-0000-4000-8000-000000000005', 'Europe/Berlin', 'de');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('99000000-0000-4000-8000-000000000001', 'core_processing', 'mvp-core-v1', 'de'),
  ('99000000-0000-4000-8000-000000000002', 'core_processing', 'mvp-core-v1', 'de'),
  ('99000000-0000-4000-8000-000000000003', 'core_processing', 'mvp-core-v1', 'de'),
  ('99000000-0000-4000-8000-000000000004', 'core_processing', 'mvp-core-v1', 'de'),
  ('99000000-0000-4000-8000-000000000005', 'core_processing', 'mvp-core-v1', 'de');

insert into public.groups (
  id, owner_user_id, name, normalized_name, timezone, leaderboard_anonymous
) values (
  '99000000-0000-4000-8000-000000000101',
  '99000000-0000-4000-8000-000000000001',
  'MVP09 Circle',
  'mvp09 circle',
  'Europe/Berlin',
  true
);

insert into public.groups (
  id, owner_user_id, name, normalized_name, timezone, leaderboard_anonymous
) values (
  '99000000-0000-4000-8000-000000000102',
  '99000000-0000-4000-8000-000000000001',
  'MVP09 Management',
  'mvp09 management',
  'Europe/Berlin',
  false
);

insert into public.groups (
  id, owner_user_id, name, normalized_name, timezone, leaderboard_anonymous
) values (
  '99000000-0000-4000-8000-000000000103',
  '99000000-0000-4000-8000-000000000001',
  'MVP09 Suspended Target',
  'mvp09 suspended target',
  'Europe/Berlin',
  false
);

insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values
  ('99000000-0000-4000-8000-000000000101', '99000000-0000-4000-8000-000000000001', 'mvp08-group-sharing-v1'),
  ('99000000-0000-4000-8000-000000000101', '99000000-0000-4000-8000-000000000002', 'mvp08-group-sharing-v1'),
  ('99000000-0000-4000-8000-000000000101', '99000000-0000-4000-8000-000000000003', 'mvp08-group-sharing-v1'),
  ('99000000-0000-4000-8000-000000000102', '99000000-0000-4000-8000-000000000001', 'mvp08-group-sharing-v1'),
  ('99000000-0000-4000-8000-000000000102', '99000000-0000-4000-8000-000000000002', 'mvp08-group-sharing-v1'),
  ('99000000-0000-4000-8000-000000000102', '99000000-0000-4000-8000-000000000003', 'mvp08-group-sharing-v1'),
  ('99000000-0000-4000-8000-000000000103', '99000000-0000-4000-8000-000000000001', 'mvp08-group-sharing-v1');

insert into public.group_memberships (
  id, group_id, user_id, sharing_consent_version
) values (
  '99000000-0000-4000-8000-000000000301',
  '99000000-0000-4000-8000-000000000103',
  '99000000-0000-4000-8000-000000000004',
  'mvp08-group-sharing-v1'
);

insert into private.group_invites (
  group_id, created_by, token_hash, code_hash, expires_at, max_uses
) values (
  '99000000-0000-4000-8000-000000000102',
  '99000000-0000-4000-8000-000000000001',
  decode('0000000000000000000000000000000000000000000000000000000000000001', 'hex'),
  decode('0000000000000000000000000000000000000000000000000000000000000002', 'hex'),
  now() + interval '7 days',
  1
);

insert into public.salawat_entries (
  id, user_id, amount, entry_date, timezone, recorded_at_client
) values (
  '99000000-0000-4000-8000-000000000201',
  '99000000-0000-4000-8000-000000000003',
  100,
  current_date,
  'Europe/Berlin',
  now()
);

set local role authenticated;
set local "request.jwt.claim.sub" = '99000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

create temp table member_list as
select public.list_group_members('99000000-0000-4000-8000-000000000101') as response;

select is(
  (select jsonb_array_length(response->'items') from member_list),
  3,
  'an active group member receives every active member'
);
select is(
  (select response->'items'->0->>'display_name' from member_list),
  'MVP09 Owner',
  'the viewer sees their own display name when the leaderboard is anonymous'
);
select isnt(
  (select response->'items'->1->>'display_name' from member_list),
  'MVP09 Member',
  'an anonymous group does not reveal another member display name'
);
select ok(
  (select response->'items'->1 ?& array['membership_id', 'display_name', 'role', 'joined_at', 'is_self'] from member_list),
  'member list returns management fields without personal entry data'
);
create temp table paginated_member_list as
select public.list_group_members(
  '99000000-0000-4000-8000-000000000101',
  null,
  null,
  2
) as response;
select is(
  (
    select response->'next_cursor'->>'membership_id'
    from paginated_member_list
  ),
  (
    select response->'items'->1->>'membership_id'
    from paginated_member_list
  ),
  'the next member cursor points to the last visible row, not the owner row'
);

set local "request.jwt.claim.sub" = '99000000-0000-4000-8000-000000000005';
select throws_ok(
  $$ select public.list_group_members('99000000-0000-4000-8000-000000000101') $$,
  'P0001',
  'NOT_FOUND',
  'a non-member cannot list private group members'
);

reset role;

select has_function(
  'public',
  'remove_group_member',
  array['uuid', 'uuid', 'integer'],
  'member removal RPC exists'
);
select has_function(
  'public',
  'leave_group',
  array['uuid'],
  'group leave RPC exists'
);
select has_function(
  'public',
  'transfer_group_ownership',
  array['uuid', 'uuid', 'integer'],
  'ownership transfer RPC exists'
);
select has_function(
  'public',
  'delete_group',
  array['uuid', 'integer'],
  'group deletion RPC exists'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '99000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

create temp table management_member_list as
select public.list_group_members('99000000-0000-4000-8000-000000000102') as response;

select throws_ok(
  $$ select public.transfer_group_ownership(
    '99000000-0000-4000-8000-000000000103',
    '99000000-0000-4000-8000-000000000301',
    1
  ) $$,
  'P0001',
  'NOT_FOUND',
  'ownership cannot be transferred to a suspended profile'
);

select throws_ok(
  $$ select public.remove_group_member(
    '99000000-0000-4000-8000-000000000102',
    (
      select (item->>'membership_id')::uuid
      from management_member_list,
        jsonb_array_elements(response->'items') as item
      where item->>'display_name' = 'MVP09 Owner'
    ),
    1
  ) $$,
  'P0001',
  'OWNER_MUST_TRANSFER',
  'the owner cannot remove their own active membership'
);

select public.remove_group_member(
  '99000000-0000-4000-8000-000000000102',
  (
    select (item->>'membership_id')::uuid
    from management_member_list,
      jsonb_array_elements(response->'items') as item
    where item->>'display_name' = 'MVP09 Member'
  ),
  1
);
create temp table management_after_removal as
select public.list_group_members('99000000-0000-4000-8000-000000000102') as response;
select ok(
  not exists (
    select 1
    from management_after_removal,
      jsonb_array_elements(response->'items') as item
    where item->>'display_name' = 'MVP09 Member'
  ),
  'removing a member hides them from the active member list'
);
select is(
  (
    select revision
    from public.groups
    where id = '99000000-0000-4000-8000-000000000102'
  ),
  2,
  'member removal advances the group revision for concurrent management'
);

select throws_ok(
  $$ select public.leave_group('99000000-0000-4000-8000-000000000102') $$,
  'P0001',
  'OWNER_MUST_TRANSFER',
  'the owner cannot leave before transferring ownership or deleting the group'
);

select public.transfer_group_ownership(
  '99000000-0000-4000-8000-000000000102',
  (
    select (item->>'membership_id')::uuid
    from management_member_list,
      jsonb_array_elements(response->'items') as item
    where item->>'display_name' = 'MVP09 Outsider'
  ),
  2
);
set local "request.jwt.claim.sub" = '99000000-0000-4000-8000-000000000003';
create temp table transferred_member_list as
select public.list_group_members('99000000-0000-4000-8000-000000000102') as response;
select is(
  (
    select item->>'role'
    from transferred_member_list,
      jsonb_array_elements(response->'items') as item
    where (item->>'is_self')::boolean
  ),
  'owner',
  'ownership transfer gives the selected active member the owner role'
);

set local "request.jwt.claim.sub" = '99000000-0000-4000-8000-000000000001';
select public.leave_group('99000000-0000-4000-8000-000000000102');
select ok(
  (
    select left_at is not null
    from public.group_memberships
    where group_id = '99000000-0000-4000-8000-000000000102'
      and user_id = '99000000-0000-4000-8000-000000000001'
  ),
  'the former owner can leave after ownership is transferred'
);

set local "request.jwt.claim.sub" = '99000000-0000-4000-8000-000000000003';
select public.delete_group('99000000-0000-4000-8000-000000000102', 3);
reset role;
select is(
  (select count(*) from public.groups where id = '99000000-0000-4000-8000-000000000102'),
  0::bigint,
  'deleting a group removes the group permanently'
);
select is(
  (
    select count(*)
    from public.group_memberships
    where group_id = '99000000-0000-4000-8000-000000000102'
  ) + (
    select count(*)
    from private.group_invites
    where group_id = '99000000-0000-4000-8000-000000000102'
  ),
  0::bigint,
  'deleting a group cascades memberships and invitations'
);
select is(
  (
    select count(*)
    from public.salawat_entries
    where id = '99000000-0000-4000-8000-000000000201'
  ),
  1::bigint,
  'deleting a group never deletes personal salawat entries'
);

select * from finish();
rollback;
