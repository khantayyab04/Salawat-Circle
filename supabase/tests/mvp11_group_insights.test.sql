begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333331', 'authenticated', 'authenticated', 'mvp11-insight-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333332', 'authenticated', 'authenticated', 'mvp11-insight-member@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'mvp11-insight-outsider@example.test', '', now(), now(), now());
insert into public.profiles (id, display_name, normalized_name)
values
  ('33333333-3333-4333-8333-333333333331', 'Insight Owner', 'insight owner'),
  ('33333333-3333-4333-8333-333333333332', 'Insight Member', 'insight member'),
  ('33333333-3333-4333-8333-333333333333', 'Insight Outsider', 'insight outsider');
insert into public.user_settings (user_id, timezone, locale)
values
  ('33333333-3333-4333-8333-333333333331', 'UTC', 'de'),
  ('33333333-3333-4333-8333-333333333332', 'UTC', 'de'),
  ('33333333-3333-4333-8333-333333333333', 'UTC', 'de');
insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('33333333-3333-4333-8333-333333333331', 'core_processing', 'mvp-core-v1', 'de'),
  ('33333333-3333-4333-8333-333333333332', 'core_processing', 'mvp-core-v1', 'de'),
  ('33333333-3333-4333-8333-333333333333', 'core_processing', 'mvp-core-v1', 'de');
insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values (
  '33333333-3333-4333-8333-333333333301',
  '33333333-3333-4333-8333-333333333331',
  'Insight Circle',
  'insight circle',
  'UTC'
);
insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values
  ('33333333-3333-4333-8333-333333333301', '33333333-3333-4333-8333-333333333331', 'mvp08-group-sharing-v1'),
  ('33333333-3333-4333-8333-333333333301', '33333333-3333-4333-8333-333333333332', 'mvp08-group-sharing-v1');

insert into public.salawat_entries (id, user_id, amount, entry_date, timezone, recorded_at_client)
values
  ('33333333-3333-4333-8333-333333333341', '33333333-3333-4333-8333-333333333331', 100, current_date, 'UTC', now()),
  ('33333333-3333-4333-8333-333333333342', '33333333-3333-4333-8333-333333333332', 200, current_date, 'UTC', now());

set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333331';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  public.get_group_insights('33333333-3333-4333-8333-333333333301')->>'week_total',
  '300',
  'an active group member receives the collective weekly total'
);

set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
select throws_ok(
  $$select public.get_group_insights('33333333-3333-4333-8333-333333333301')$$,
  'P0001',
  'NOT_FOUND',
  'an outsider cannot read another group’s collective insights'
);

select * from finish();
rollback;
