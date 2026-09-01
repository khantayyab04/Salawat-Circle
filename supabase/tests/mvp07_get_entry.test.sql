begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select has_function('public', 'get_entry', array['uuid'], 'entry lookup RPC exists');
select is(
  (
    select count(*)
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
    where procedure.oid = 'public.get_entry(uuid)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'PUBLIC cannot execute the entry lookup RPC'
);
select is(
  pg_catalog.has_function_privilege('anon', 'public.get_entry(uuid)', 'EXECUTE'),
  false,
  'anonymous clients cannot execute the entry lookup RPC'
);
select is(
  pg_catalog.has_function_privilege('authenticated', 'public.get_entry(uuid)', 'EXECUTE'),
  true,
  'authenticated clients can execute the entry lookup RPC'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '70707070-7070-4070-8070-707070707070', 'authenticated', 'authenticated', 'mvp07-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71717171-7171-4171-8171-717171717171', 'authenticated', 'authenticated', 'mvp07-other@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '72727272-7272-4272-8272-727272727272', 'authenticated', 'authenticated', 'mvp07-unconsented@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('70707070-7070-4070-8070-707070707070', 'MVP Seven Owner', 'mvp seven owner'),
  ('71717171-7171-4171-8171-717171717171', 'MVP Seven Other', 'mvp seven other'),
  ('72727272-7272-4272-8272-727272727272', 'MVP Seven Unconsented', 'mvp seven unconsented');
insert into public.user_settings (user_id, timezone, locale)
values
  ('70707070-7070-4070-8070-707070707070', 'Europe/Berlin', 'de'),
  ('71717171-7171-4171-8171-717171717171', 'Europe/Berlin', 'en'),
  ('72727272-7272-4272-8272-727272727272', 'Europe/Berlin', 'en');
insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('70707070-7070-4070-8070-707070707070', 'core_processing', 'mvp-core-v1', 'de'),
  ('71717171-7171-4171-8171-717171717171', 'core_processing', 'mvp-core-v1', 'en');
insert into public.salawat_entries (
  id, user_id, amount, entry_date, timezone, recorded_at_client, revision
) values
  ('70000000-0000-4000-8000-000000000001', '70707070-7070-4070-8070-707070707070', 70, current_date, 'Europe/Berlin', now(), 3),
  ('70000000-0000-4000-8000-000000000002', '71717171-7171-4171-8171-717171717171', 71, current_date, 'Europe/Berlin', now(), 4);

set local role anon;
select throws_ok(
  $$ select public.get_entry('70000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'anonymous entry lookup is denied'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '72727272-7272-4272-8272-727272727272';
set local "request.jwt.claim.role" = 'authenticated';
select throws_ok(
  $$ select public.get_entry('70000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'CONSENT_REQUIRED',
  'entry lookup requires core consent'
);

set local "request.jwt.claim.sub" = '70707070-7070-4070-8070-707070707070';
select is(
  public.get_entry('70000000-0000-4000-8000-000000000001')->'entry'->>'id',
  '70000000-0000-4000-8000-000000000001',
  'entry lookup returns the requested own entry'
);
select is(
  public.get_entry('70000000-0000-4000-8000-000000000001')->'entry'->>'amount',
  '70',
  'entry lookup uses the shared entry payload'
);
select is(
  (public.get_entry('70000000-0000-4000-8000-000000000001')->'entry'->>'revision')::integer,
  3,
  'entry lookup includes the current revision'
);
select ok(
  public.get_entry('70000000-0000-4000-8000-000000000001') ?& array['request_id', 'server_time'],
  'entry lookup uses the shared response metadata'
);
select is(
  public.get_entry('70000000-0000-4000-8000-000000000001')->'entry' ? 'user_id',
  false,
  'entry lookup does not expose an account identifier'
);
select throws_ok(
  $$ select public.get_entry('70000000-0000-4000-8000-000000000099') $$,
  'P0001',
  'NOT_FOUND',
  'a missing entry returns not found'
);
select throws_ok(
  $$ select public.get_entry('70000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'NOT_FOUND',
  'a foreign entry is indistinguishable from a missing entry'
);

reset role;
update public.profiles
set status = 'suspended'
where id = '70707070-7070-4070-8070-707070707070';
set local role authenticated;
set local "request.jwt.claim.sub" = '70707070-7070-4070-8070-707070707070';
set local "request.jwt.claim.role" = 'authenticated';
select throws_ok(
  $$ select public.get_entry('70000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'FORBIDDEN',
  'entry lookup requires an active profile'
);

reset role;
select * from finish();
rollback;
