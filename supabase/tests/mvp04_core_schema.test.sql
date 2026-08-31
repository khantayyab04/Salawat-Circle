begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

select has_table('public', 'salawat_entries', 'entries table exists');
select has_table('public', 'daily_goal_versions', 'goal versions table exists');
select has_table('public', 'groups', 'groups table exists');
select has_table('public', 'group_memberships', 'membership periods table exists');
select has_table('private', 'group_invites', 'private invites table exists');
select has_table('private', 'group_invite_uses', 'private invite uses table exists');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  '77777777-7777-4777-8777-777777777777',
  'authenticated', 'authenticated', 'seven@example.test', '', now(), now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '88888888-8888-4888-8888-888888888888',
  'authenticated', 'authenticated', 'eight@example.test', '', now(), now(), now()
);
insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values ('12121212-1212-4121-8121-121212121212', '77777777-7777-4777-8777-777777777777', 'Schema Circle', 'schema circle', 'Europe/Berlin');

insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client)
values ('13131313-1313-4131-8131-131313131313', '77777777-7777-4777-8777-777777777777', 1, current_date, 'Europe/Berlin', now());
select throws_ok(
  $$ insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client) values ('13131313-1313-4131-8131-131313131313', '77777777-7777-4777-8777-777777777777', 1, current_date, 'Europe/Berlin', now()) $$,
  '23505', null,
  'the client-generated entry UUID is globally unique'
);
select throws_ok(
  $$ insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client) values ('14141414-1414-4141-8141-141414141414', '77777777-7777-4777-8777-777777777777', 0, current_date, 'Europe/Berlin', now()) $$,
  '23514', null,
  'the database rejects out-of-range entry amounts'
);

insert into public.daily_goal_versions (user_id, effective_from, amount)
values ('77777777-7777-4777-8777-777777777777', current_date, 100);
select throws_ok(
  $$ insert into public.daily_goal_versions (user_id, effective_from, amount) values ('77777777-7777-4777-8777-777777777777', current_date, 200) $$,
  '23505', null,
  'a user has at most one daily goal version per effective date'
);

insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values ('12121212-1212-4121-8121-121212121212', '77777777-7777-4777-8777-777777777777', 'mvp04-owner-v1');
select throws_ok(
  $$ insert into public.group_memberships (group_id, user_id, sharing_consent_version) values ('12121212-1212-4121-8121-121212121212', '77777777-7777-4777-8777-777777777777', 'mvp04-owner-v1') $$,
  '23505', null,
  'a group has at most one active membership period per user'
);
update public.group_memberships
set left_at = now()
where group_id = '12121212-1212-4121-8121-121212121212';
select lives_ok(
  $$ insert into public.group_memberships (group_id, user_id, sharing_consent_version) values ('12121212-1212-4121-8121-121212121212', '77777777-7777-4777-8777-777777777777', 'mvp04-owner-v1') $$,
  'a historic membership period does not prevent a new active period'
);

insert into private.group_invites (group_id, created_by, token_hash, code_hash, expires_at, max_uses)
values ('12121212-1212-4121-8121-121212121212', '77777777-7777-4777-8777-777777777777', decode('01', 'hex'), decode('02', 'hex'), now() + interval '1 day', 1);
select throws_ok(
  $$ insert into private.group_invites (group_id, created_by, token_hash, code_hash, expires_at, max_uses) values ('12121212-1212-4121-8121-121212121212', '88888888-8888-4888-8888-888888888888', decode('07', 'hex'), decode('08', 'hex'), now() + interval '1 day', 1) $$,
  'P0001', 'FORBIDDEN',
  'an invite creator must be the current group owner'
);
select throws_ok(
  $$ insert into private.group_invites (group_id, created_by, token_hash, code_hash, expires_at, max_uses) values ('12121212-1212-4121-8121-121212121212', '77777777-7777-4777-8777-777777777777', decode('01', 'hex'), decode('03', 'hex'), now() + interval '1 day', 1) $$,
  '23505', null,
  'raw invite token hashes are unique'
);
select throws_ok(
  $$ insert into private.group_invites (group_id, created_by, token_hash, code_hash, expires_at, max_uses) values ('12121212-1212-4121-8121-121212121212', '77777777-7777-4777-8777-777777777777', decode('04', 'hex'), decode('02', 'hex'), now() + interval '1 day', 1) $$,
  '23505', null,
  'manual invite code hashes are unique'
);
select throws_ok(
  $$ insert into private.group_invites (group_id, created_by, token_hash, code_hash, expires_at, max_uses) values ('12121212-1212-4121-8121-121212121212', '77777777-7777-4777-8777-777777777777', decode('05', 'hex'), decode('06', 'hex'), now() + interval '31 days', 1) $$,
  '23514', null,
  'invites cannot outlive the thirty-day maximum'
);
select throws_ok(
  $$ insert into public.groups (id, owner_user_id, name, normalized_name, timezone) values ('15151515-1515-4151-8151-151515151515', '00000000-0000-4000-8000-000000000000', 'Orphan Circle', 'orphan circle', 'Europe/Berlin') $$,
  '23503', null,
  'groups cannot have an orphaned owner'
);
select throws_ok(
  $$ insert into public.groups (id, owner_user_id, name, normalized_name, timezone) values ('16161616-1616-4161-8161-161616161616', '77777777-7777-4777-8777-777777777777', E'Bad\nName', 'bad name', 'Europe/Berlin') $$,
  '23514', null,
  'the schema rejects control characters in group names'
);
insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values ('19191919-1919-4191-8191-191919191919', '77777777-7777-4777-8777-777777777777', 'Second Circle', 'second circle', 'Europe/Berlin');
insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values ('19191919-1919-4191-8191-191919191919', '77777777-7777-4777-8777-777777777777', 'mvp04-owner-v1');
select throws_ok(
  $$ insert into private.group_invite_uses (invite_id, user_id, membership_id) values ((select id from private.group_invites where token_hash = decode('01', 'hex')), '77777777-7777-4777-8777-777777777777', (select id from public.group_memberships where group_id = '19191919-1919-4191-8191-191919191919')) $$,
  'P0001', 'FORBIDDEN',
  'an invite use must refer to a membership from the invited group'
);

select * from finish();
rollback;
