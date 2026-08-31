begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '50505050-5050-4050-8050-505050505050',
  'authenticated',
  'authenticated',
  'pagination@example.test',
  '',
  now(),
  now(),
  now()
);
insert into public.profiles (id, display_name, normalized_name)
values ('50505050-5050-4050-8050-505050505050', 'Pagination Member', 'pagination member');
insert into public.user_settings (user_id, timezone, locale)
values ('50505050-5050-4050-8050-505050505050', 'Europe/Berlin', 'de');
insert into private.consent_records (user_id, consent_type, document_version, locale)
values ('50505050-5050-4050-8050-505050505050', 'core_processing', 'mvp-core-v1', 'de');
insert into public.salawat_entries (
  id, user_id, amount, entry_date, timezone, recorded_at_client, created_at
) values
  ('50000000-0000-4000-8000-000000000001', '50505050-5050-4050-8050-505050505050', 1, current_date, 'Europe/Berlin', now(), now() - interval '3 minutes'),
  ('50000000-0000-4000-8000-000000000002', '50505050-5050-4050-8050-505050505050', 2, current_date, 'Europe/Berlin', now(), now() - interval '2 minutes'),
  ('50000000-0000-4000-8000-000000000003', '50505050-5050-4050-8050-505050505050', 3, current_date, 'Europe/Berlin', now(), now() - interval '1 minute');

set local role authenticated;
set local "request.jwt.claim.sub" = '50505050-5050-4050-8050-505050505050';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  public.list_entries(null, null, null, 1)->'next_cursor'->>'id',
  '50000000-0000-4000-8000-000000000003',
  'the next cursor identifies the last item returned on the current page'
);

with first_page as (
  select public.list_entries(null, null, null, 1) as response
), second_page as (
  select public.list_entries(
    (response->'next_cursor'->>'entry_date')::date,
    (response->'next_cursor'->>'created_at')::timestamptz,
    (response->'next_cursor'->>'id')::uuid,
    1
  ) as response
  from first_page
)
select is(
  response->'items'->0->>'id',
  '50000000-0000-4000-8000-000000000002',
  'the second page starts directly after the first without skipping an item'
)
from second_page;

reset role;
select * from finish();
rollback;
