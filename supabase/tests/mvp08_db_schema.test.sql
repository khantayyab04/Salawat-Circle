begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

select has_column(
  'public',
  'groups',
  'leaderboard_anonymous',
  'groups expose leaderboard anonymity switch'
);
select col_not_null(
  'public',
  'groups',
  'leaderboard_anonymous',
  'leaderboard anonymity switch is mandatory'
);
select col_default_is(
  'public',
  'groups',
  'leaderboard_anonymous',
  'false',
  'leaderboard anonymity defaults to disabled'
);

select col_is_null(
  'public',
  'group_memberships',
  'alias_name',
  'membership alias display name stays nullable for backfill'
);
select col_is_null(
  'public',
  'group_memberships',
  'alias_normalized',
  'membership alias normalized value stays nullable for backfill'
);
select has_index(
  'public',
  'group_memberships',
  'memberships_active_alias_normalized_unique_idx',
  'active memberships enforce unique non-null aliases per group'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '80808080-8080-4080-8080-808080808080', 'authenticated', 'authenticated', 'mvp08-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81818181-8181-4181-8181-818181818181', 'authenticated', 'authenticated', 'mvp08-null@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '82828282-8282-4282-8282-828282828282', 'authenticated', 'authenticated', 'mvp08-dup@example.test', '', now(), now(), now());

insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values ('20202020-2020-4020-8020-202020202020', '80808080-8080-4080-8080-808080808080', 'Alias Circle', 'alias circle', 'Europe/Berlin');

insert into public.group_memberships (group_id, user_id, sharing_consent_version, alias_name, alias_normalized)
values ('20202020-2020-4020-8020-202020202020', '80808080-8080-4080-8080-808080808080', 'mvp08-owner-v1', 'Alpha', 'alpha');

select lives_ok(
  $$
    insert into public.group_memberships (group_id, user_id, sharing_consent_version)
    values ('20202020-2020-4020-8020-202020202020', '81818181-8181-4181-8181-818181818181', 'mvp08-null-v1')
  $$,
  'active memberships may omit aliases during backfill'
);

select throws_ok(
  $$
    insert into public.group_memberships (group_id, user_id, sharing_consent_version, alias_name, alias_normalized)
    values ('20202020-2020-4020-8020-202020202020', '82828282-8282-4282-8282-828282828282', 'mvp08-dup-v1', 'ALPHA', 'alpha')
  $$,
  '23505',
  null,
  'active memberships cannot reuse an alias in the same group'
);

update public.group_memberships
set left_at = now()
where group_id = '20202020-2020-4020-8020-202020202020'
  and user_id in (
    '80808080-8080-4080-8080-808080808080',
    '82828282-8282-4282-8282-828282828282'
  );

select lives_ok(
  $$
    insert into public.group_memberships (group_id, user_id, sharing_consent_version, alias_name, alias_normalized)
    values ('20202020-2020-4020-8020-202020202020', '82828282-8282-4282-8282-828282828282', 'mvp08-rejoin-v1', 'ALPHA', 'alpha')
  $$,
  'inactive alias history does not block a new active member alias'
);

select has_table(
  'private',
  'rate_limit_buckets',
  'private rate-limit buckets are available for atomic counters'
);
select has_column(
  'private',
  'rate_limit_buckets',
  'actor_key',
  'rate-limit bucket tracks actor key'
);
select has_column(
  'private',
  'rate_limit_buckets',
  'action_key',
  'rate-limit bucket tracks action key'
);
select has_column(
  'private',
  'rate_limit_buckets',
  'window_key',
  'rate-limit bucket tracks window identifier'
);
select has_column(
  'private',
  'rate_limit_buckets',
  'bucket_start',
  'rate-limit bucket tracks window start'
);
select has_column(
  'private',
  'rate_limit_buckets',
  'hit_count',
  'rate-limit bucket tracks hit counter'
);
select has_column(
  'private',
  'rate_limit_buckets',
  'blocked_until',
  'rate-limit bucket tracks temporary blocking horizon'
);
select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'private.rate_limit_buckets'::regclass
  $$,
  array[true],
  'rate-limit buckets have forced row-level security'
);

select is(
  pg_catalog.has_table_privilege('anon', 'private.rate_limit_buckets', 'SELECT'),
  false,
  'anonymous clients have no private rate-limit read privilege'
);
select is(
  pg_catalog.has_table_privilege('authenticated', 'private.rate_limit_buckets', 'SELECT'),
  false,
  'authenticated clients have no private rate-limit read privilege'
);

set local role authenticated;
select throws_ok(
  $$ select count(*) from private.rate_limit_buckets $$,
  '42501',
  null,
  'authenticated clients cannot read private rate-limit buckets'
);
reset role;

select is(
  pg_catalog.has_table_privilege('authenticated', 'public.groups', 'INSERT'),
  false,
  'public groups remain write-protected from direct authenticated inserts'
);
select is(
  pg_catalog.has_table_privilege('authenticated', 'public.group_memberships', 'INSERT'),
  false,
  'public memberships remain write-protected from direct authenticated inserts'
);

select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'public.groups'::regclass
  $$,
  array[true],
  'groups keep forced row-level security'
);
select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'public.group_memberships'::regclass
  $$,
  array[true],
  'memberships keep forced row-level security'
);

select * from finish();
rollback;
