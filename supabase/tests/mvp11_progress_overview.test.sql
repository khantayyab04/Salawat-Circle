begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'mvp11-progress@example.test',
  '',
  now(),
  now(),
  now()
);
insert into public.profiles (id, display_name, normalized_name)
values ('11111111-1111-4111-8111-111111111111', 'Progress Member', 'progress member');
insert into public.user_settings (user_id, timezone, locale)
values ('11111111-1111-4111-8111-111111111111', 'UTC', 'de');
insert into private.consent_records (user_id, consent_type, document_version, locale)
values ('11111111-1111-4111-8111-111111111111', 'core_processing', 'mvp-core-v1', 'de');
insert into public.salawat_entries (
  id, user_id, amount, entry_date, timezone, recorded_at_client
) values (
  '11111111-1111-4111-8111-111111111112',
  '11111111-1111-4111-8111-111111111111',
  100,
  (now() at time zone 'UTC')::date,
  'UTC',
  now()
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  (public.get_progress_overview('UTC', 7)->>'active_days')::integer,
  1,
  'progress overview exposes only active days in the requested personal window'
);

select * from finish();
rollback;
