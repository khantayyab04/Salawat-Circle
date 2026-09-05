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
set local "request.jwt.claim.role" = 'authenticated';

select is(
  public.set_group_goal('22222222-2222-4222-8222-222222222201', 'week', 10000, 1)->>'amount',
  '10000',
  'an owner can set a weekly group goal'
);

select throws_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'week', 10000, null)$$,
  'P0001',
  'INVALID_INPUT',
  'a missing revision cannot bypass optimistic concurrency'
);

set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.set_group_goal('22222222-2222-4222-8222-222222222201', 'week', 10000, 2)$$,
  'P0001',
  'NOT_FOUND',
  'a member cannot set a group goal'
);

select * from finish();
rollback;
