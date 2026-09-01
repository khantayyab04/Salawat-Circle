begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '73000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'group-name-owner@example.test',
  '',
  now(),
  now(),
  now()
);

insert into public.profiles (id, display_name, normalized_name)
values ('73000000-0000-4000-8000-000000000001', 'Name Policy Owner', 'name policy owner');

insert into public.user_settings (user_id, timezone, locale)
values ('73000000-0000-4000-8000-000000000001', 'Europe/Berlin', 'de');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values ('73000000-0000-4000-8000-000000000001', 'core_processing', 'mvp-core-v1', 'de');

create function pg_temp.create_group_error(p_group_id uuid, p_name text)
returns text
language plpgsql
as $$
begin
  perform public.create_group(p_group_id, p_name, 'Europe/Berlin', false, true);
  return null;
exception
  when others then
    return sqlerrm;
end;
$$;

create function pg_temp.update_group_name_error(p_name text)
returns text
language plpgsql
as $$
begin
  perform public.update_group_name(
    '73000000-0000-4000-8000-000000000102',
    p_name,
    1
  );
  return null;
exception
  when others then
    return sqlerrm;
end;
$$;

set local role authenticated;
set local "request.jwt.claim.sub" = '73000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$ select public.create_group(
    '73000000-0000-4000-8000-000000000101',
    U&'Safe\200BCircle',
    'Europe/Berlin',
    false,
    true
  ) $$,
  'P0001',
  'NAME_REJECTED',
  'create_group rejects a zero-width space'
);

select public.create_group(
  '73000000-0000-4000-8000-000000000102',
  'Rename Source',
  'Europe/Berlin',
  false,
  true
);

select throws_ok(
  $$ select public.update_group_name(
    '73000000-0000-4000-8000-000000000102',
    U&'Safe\200BCircle',
    1
  ) $$,
  'P0001',
  'NAME_REJECTED',
  'update_group_name uses the same zero-width policy'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('posix-tab', '73000000-0000-4000-8000-000000000111'::uuid, E'Tab\tName'),
        ('posix-newline', '73000000-0000-4000-8000-000000000112'::uuid, E'Line\nName'),
        ('c0-control', '73000000-0000-4000-8000-000000000113'::uuid, U&'Bell\0007Name'),
        ('c1-control', '73000000-0000-4000-8000-000000000114'::uuid, U&'Next\0085Line')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('c0-control', 'NAME_REJECTED'),
      ('c1-control', 'NAME_REJECTED'),
      ('posix-newline', 'NAME_REJECTED'),
      ('posix-tab', 'NAME_REJECTED')
  $$,
  'group names reject POSIX, C0 and C1 controls before whitespace collapsing'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('bom', '73000000-0000-4000-8000-000000000121'::uuid, U&'Safe\FEFFName'),
        ('soft-hyphen', '73000000-0000-4000-8000-000000000122'::uuid, U&'Safe\00ADName'),
        ('word-joiner', '73000000-0000-4000-8000-000000000123'::uuid, U&'Safe\2060Name'),
        ('zero-width-joiner', '73000000-0000-4000-8000-000000000124'::uuid, U&'Safe\200DName'),
        ('zero-width-non-joiner', '73000000-0000-4000-8000-000000000125'::uuid, U&'Safe\200CName'),
        ('zero-width-space', '73000000-0000-4000-8000-000000000126'::uuid, U&'Safe\200BName')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('bom', 'NAME_REJECTED'),
      ('soft-hyphen', 'NAME_REJECTED'),
      ('word-joiner', 'NAME_REJECTED'),
      ('zero-width-joiner', 'NAME_REJECTED'),
      ('zero-width-non-joiner', 'NAME_REJECTED'),
      ('zero-width-space', 'NAME_REJECTED')
  $$,
  'group names reject every specified zero-width deception character'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('arabic-letter-mark', '73000000-0000-4000-8000-000000000131'::uuid, U&'Safe\061CName'),
        ('left-to-right-mark', '73000000-0000-4000-8000-000000000132'::uuid, U&'Safe\200EName'),
        ('right-to-left-mark', '73000000-0000-4000-8000-000000000133'::uuid, U&'Safe\200FName'),
        ('bidi-embedding', '73000000-0000-4000-8000-000000000134'::uuid, U&'Safe\202AName'),
        ('bidi-pop-formatting', '73000000-0000-4000-8000-000000000135'::uuid, U&'Safe\202CName'),
        ('bidi-override', '73000000-0000-4000-8000-000000000136'::uuid, U&'Safe\202EName'),
        ('bidi-isolate', '73000000-0000-4000-8000-000000000137'::uuid, U&'Safe\2066Name'),
        ('bidi-pop-isolate', '73000000-0000-4000-8000-000000000138'::uuid, U&'Safe\2069Name')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('arabic-letter-mark', 'NAME_REJECTED'),
      ('bidi-embedding', 'NAME_REJECTED'),
      ('bidi-isolate', 'NAME_REJECTED'),
      ('bidi-override', 'NAME_REJECTED'),
      ('bidi-pop-formatting', 'NAME_REJECTED'),
      ('bidi-pop-isolate', 'NAME_REJECTED'),
      ('left-to-right-mark', 'NAME_REJECTED'),
      ('right-to-left-mark', 'NAME_REJECTED')
  $$,
  'group names reject bidi marks, embeddings, overrides and isolates'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('variation-selector-text', '73000000-0000-4000-8000-000000000141'::uuid, U&'Safe\FE0EName'),
        ('variation-selector-emoji', '73000000-0000-4000-8000-000000000142'::uuid, U&'Safe\FE0FName'),
        ('variation-selector-supplement', '73000000-0000-4000-8000-000000000143'::uuid, U&'Safe\+0E0100Name')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('variation-selector-emoji', 'NAME_REJECTED'),
      ('variation-selector-supplement', 'NAME_REJECTED'),
      ('variation-selector-text', 'NAME_REJECTED')
  $$,
  'group names reject standard and supplementary variation selectors'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('emoji-only', '73000000-0000-4000-8000-000000000151'::uuid, U&'\+01F600\+01F64F'),
        ('punctuation-only', '73000000-0000-4000-8000-000000000152'::uuid, '...?!'),
        ('symbol-only', '73000000-0000-4000-8000-000000000153'::uuid, U&'\2605\2606')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('emoji-only', 'NAME_REJECTED'),
      ('punctuation-only', 'NAME_REJECTED'),
      ('symbol-only', 'NAME_REJECTED')
  $$,
  'group names require at least one Unicode letter or number'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('custom-scheme', '73000000-0000-4000-8000-000000000161'::uuid, 'circle+app://join'),
        ('domain', '73000000-0000-4000-8000-000000000162'::uuid, 'example.de'),
        ('email', '73000000-0000-4000-8000-000000000163'::uuid, 'person@example.com'),
        ('email-like', '73000000-0000-4000-8000-000000000167'::uuid, 'person@example'),
        ('https-url', '73000000-0000-4000-8000-000000000164'::uuid, 'https://example.com/join'),
        ('mailto-scheme', '73000000-0000-4000-8000-000000000165'::uuid, 'mailto:person@example.com'),
        ('www-domain', '73000000-0000-4000-8000-000000000166'::uuid, 'www.example.org')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('custom-scheme', 'NAME_REJECTED'),
      ('domain', 'NAME_REJECTED'),
      ('email', 'NAME_REJECTED'),
      ('email-like', 'NAME_REJECTED'),
      ('https-url', 'NAME_REJECTED'),
      ('mailto-scheme', 'NAME_REJECTED'),
      ('www-domain', 'NAME_REJECTED')
  $$,
  'group names reject schemes, URLs, www, domains and email-like patterns'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('de-fotze', '73000000-0000-4000-8000-000000000171'::uuid, 'Fotze Gruppe'),
        ('de-hurensohn', '73000000-0000-4000-8000-000000000172'::uuid, 'HURENSOHN'),
        ('en-cunt', '73000000-0000-4000-8000-000000000173'::uuid, 'Cunt Circle'),
        ('en-faggot', '73000000-0000-4000-8000-000000000174'::uuid, 'FaGgOt Team'),
        ('en-nigger', '73000000-0000-4000-8000-000000000175'::uuid, 'NIGGER')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('de-fotze', 'NAME_REJECTED'),
      ('de-hurensohn', 'NAME_REJECTED'),
      ('en-cunt', 'NAME_REJECTED'),
      ('en-faggot', 'NAME_REJECTED'),
      ('en-nigger', 'NAME_REJECTED')
  $$,
  'group names reject the narrow case-insensitive de/en abuse token list'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('domain-like-version', '73000000-0000-4000-8000-000000000181'::uuid, 'Version 1.2 Circle'),
        ('period-with-space', '73000000-0000-4000-8000-000000000182'::uuid, 'St. Mary Circle'),
        ('token-inside-scunthorpe', '73000000-0000-4000-8000-000000000183'::uuid, 'Scunthorpe Circle'),
        ('token-inside-snigger', '73000000-0000-4000-8000-000000000184'::uuid, 'Snigger Club')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('domain-like-version', null::text),
      ('period-with-space', null::text),
      ('token-inside-scunthorpe', null::text),
      ('token-inside-snigger', null::text)
  $$,
  'token and domain rules do not reject benign boundary lookalikes'
);

reset role;
delete from private.rate_limit_buckets
where actor_key = '73000000-0000-4000-8000-000000000001'
  and action_key = 'create_group';
set local role authenticated;
set local "request.jwt.claim.sub" = '73000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

create temp table normalized_group as
select public.create_group(
  '73000000-0000-4000-8000-000000000191',
  U&'  Cafe\0301   Freunde  ',
  'Europe/Berlin',
  false,
  true
) as response;

select is(
  (select response->'group'->>'name' from normalized_group),
  U&'Caf\00E9 Freunde',
  'create_group stores NFC-normalized names with collapsed surrounding whitespace'
);

select is(
  public.create_group(
    '73000000-0000-4000-8000-000000000197',
    U&'\00A0Arabic\2003 Circle\00A0',
    'Europe/Berlin',
    false,
    true
  )->'group'->>'name',
  'Arabic Circle',
  'group-name normalization trims and collapses Unicode whitespace'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('arabic', '73000000-0000-4000-8000-000000000192'::uuid, U&'\062D\0644\0642\0629 \0627\0644\0633\0644\0627\0645 \0661\0662'),
        ('diacritics', '73000000-0000-4000-8000-000000000193'::uuid, U&'Gr\00FC\00DFe M\00FCnchen 2')
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('arabic', null::text),
      ('diacritics', null::text)
  $$,
  'valid Arabic, Unicode-number and diacritic names remain accepted'
);

select results_eq(
  $$
    select case_name, pg_temp.create_group_error(group_id, candidate)
    from (
      values
        ('one-character', '73000000-0000-4000-8000-000000000194'::uuid, 'A'),
        ('fifty-code-points', '73000000-0000-4000-8000-000000000195'::uuid, pg_catalog.repeat(U&'\062D', 50)),
        ('fifty-one-code-points', '73000000-0000-4000-8000-000000000196'::uuid, pg_catalog.repeat(U&'\062D', 51))
    ) as cases(case_name, group_id, candidate)
    order by case_name
  $$,
  $$
    values
      ('fifty-code-points', null::text),
      ('fifty-one-code-points', 'NAME_REJECTED'),
      ('one-character', 'NAME_REJECTED')
  $$,
  'group name length is enforced on 2 to 50 normalized Unicode code points'
);

select results_eq(
  $$
    select case_name, pg_temp.update_group_name_error(candidate)
    from (
      values
        ('abuse-token', 'Cunt Circle'),
        ('bidi-control', U&'Safe\202EName'),
        ('c0-control', U&'Safe\0007Name'),
        ('domain', 'example.de'),
        ('emoji-only', U&'\+01F600\+01F64F'),
        ('too-long', pg_catalog.repeat('A', 51)),
        ('variation-selector', U&'Safe\FE0FName'),
        ('zero-width', U&'Safe\200CName')
    ) as cases(case_name, candidate)
    order by case_name
  $$,
  $$
    values
      ('abuse-token', 'NAME_REJECTED'),
      ('bidi-control', 'NAME_REJECTED'),
      ('c0-control', 'NAME_REJECTED'),
      ('domain', 'NAME_REJECTED'),
      ('emoji-only', 'NAME_REJECTED'),
      ('too-long', 'NAME_REJECTED'),
      ('variation-selector', 'NAME_REJECTED'),
      ('zero-width', 'NAME_REJECTED')
  $$,
  'update_group_name returns NAME_REJECTED for every shared policy category'
);

reset role;

select has_function(
  'private',
  'normalise_group_name',
  array['text'],
  'one private group-name normalizer and validator exists'
);

select results_eq(
  $$
    select role_name, pg_catalog.has_function_privilege(
      role_name,
      'private.normalise_group_name(text)',
      'EXECUTE'
    )
    from (values ('anon'), ('authenticated')) as roles(role_name)
    union all
    select 'public', exists (
      select 1
      from pg_catalog.pg_proc procedure
      cross join lateral pg_catalog.aclexplode(procedure.proacl) privilege
      where procedure.oid = 'private.normalise_group_name(text)'::regprocedure
        and privilege.grantee = 0
        and privilege.privilege_type = 'EXECUTE'
    )
    order by role_name
  $$,
  $$
    values
      ('anon', false),
      ('authenticated', false),
      ('public', false)
  $$,
  'the private group-name helper is not executable by client roles or PUBLIC'
);

select * from finish();
rollback;
