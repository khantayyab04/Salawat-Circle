begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222221', 'authenticated', 'authenticated', 'mvp11-goal-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'mvp11-goal-member@example.test', '', now(), now(), now());
insert into public.profiles (id, display_name, normalized_name)
values
  ('22222222-2222-4222-8222-222222222221', 'Goal Owner', 'goal owner'),
  ('22222222-2222-4222-8222-222222222222', 'Goal Member', 'goal member');
insert into public.user_settings (user_id, timezone, locale)
values
  ('22222222-2222-4222-8222-222222222221', 'UTC', 'de'),
  ('22222222-2222-4222-8222-222222222222', 'UTC', 'de');
insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('22222222-2222-4222-8222-222222222221', 'core_processing', 'mvp-core-v1', 'de'),
  ('22222222-2222-4222-8222-222222222222', 'core_processing', 'mvp-core-v1', 'de');
insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values (
  '22222222-2222-4222-8222-222222222201',
  '22222222-2222-4222-8222-222222222221',
  'Goal Circle',
  'goal circle',
  'UTC'
);
insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values
  ('22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222221', 'mvp08-group-sharing-v1'),
  ('22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222222', 'mvp08-group-sharing-v1');

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222221';
select throws_ok($$select public.leave_group('22222222-2222-4222-8222-222222222201')$$, 'P0001', 'OWNER_MUST_TRANSFER', 'owner cannot leave another member ownerless');
reset role;
update public.group_memberships set left_at=now() where user_id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
select lives_ok($$select public.leave_group('22222222-2222-4222-8222-222222222201')$$, 'lone owner can leave and atomically delete group');
reset role;
select is((select count(*) from public.groups where id='22222222-2222-4222-8222-222222222201'), 0::bigint, 'no active ownerless group remains');
select * from finish();
rollback;
