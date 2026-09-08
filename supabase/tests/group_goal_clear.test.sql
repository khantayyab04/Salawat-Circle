begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

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
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'week', null, 1)$$,
  'an owner can explicitly deactivate a weekly goal'
);
select is(public.get_group_insights('22222222-2222-4222-8222-222222222201', 'week')->'goal_amount',
  'null'::jsonb, 'deactivated weekly goal is absent from insights');
select lives_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'month', null, 2)$$,
  'an owner can deactivate a monthly goal'
);
select lives_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'all', null, 3)$$,
  'an owner can deactivate an all time goal'
);
select throws_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', null, null, 4)$$,
  'P0001', 'INVALID_INPUT', 'a null period is rejected');
select throws_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'week', null, 1)$$,
  'P0001', 'ENTRY_VERSION_CONFLICT', 'clearing still enforces the latest revision');
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'week', null, 4)$$,
  'P0001', 'NOT_FOUND', 'an ordinary member cannot clear the group goal');
reset role;
update public.group_memberships set left_at = now() where user_id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
select throws_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'week', null, 4)$$,
  'P0001', 'NOT_FOUND', 'a former member cannot clear the group goal');
select * from finish();
rollback;
