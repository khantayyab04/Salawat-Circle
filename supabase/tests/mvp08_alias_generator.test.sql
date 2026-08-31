begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '90909090-9090-4090-8090-909090909090', 'authenticated', 'authenticated', 'mvp08-alias-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '91919191-9191-4191-8191-919191919191', 'authenticated', 'authenticated', 'mvp08-collision-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '92929292-9292-4292-8292-929292929292', 'authenticated', 'authenticated', 'mvp08-collision-b@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '93939393-9393-4393-8393-939393939393', 'authenticated', 'authenticated', 'mvp08-collision-target@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94949494-9494-4494-8494-949494949494', 'authenticated', 'authenticated', 'mvp08-backfill-active@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '95959595-9595-4595-8595-959595959595', 'authenticated', 'authenticated', 'mvp08-backfill-historical@example.test', '', now(), now(), now());

insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values ('30303030-3030-4030-8030-303030303030', '90909090-9090-4090-8090-909090909090', 'Alias Generator Circle', 'alias generator circle', 'Europe/Berlin');

insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values ('30303030-3030-4030-8030-303030303030', '90909090-9090-4090-8090-909090909090', 'mvp08-alias-v1');

select results_eq(
  $$
    select (
      alias_name is not null
      and alias_normalized = pg_catalog.lower(private.normalise_name(alias_name))
      and alias_key is not null
    )::boolean
    from public.group_memberships
    where group_id = '30303030-3030-4030-8030-303030303030'
      and user_id = '90909090-9090-4090-8090-909090909090'
      and left_at is null
  $$,
  array[true],
  'server-generated active aliases include a canonical name and opaque row key'
);

select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where left_at is null
      and (alias_name is null or alias_normalized is null or alias_key is null)
  $$,
  array[0::bigint],
  'active memberships persist non-null aliases and row keys'
);

insert into public.group_memberships (id, group_id, user_id, sharing_consent_version, alias_name, alias_normalized)
select
  '31313131-3131-4131-8131-313131313131'::uuid,
  '30303030-3030-4030-8030-303030303030'::uuid,
  '91919191-9191-4191-8191-919191919191'::uuid,
  'mvp08-collision-v1',
  candidate.alias_name,
  candidate.alias_normalized
from private.membership_alias_candidate(
  '30303030-3030-4030-8030-303030303030'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid,
  0
) candidate;

insert into public.group_memberships (id, group_id, user_id, sharing_consent_version, alias_name, alias_normalized)
select
  '32323232-3232-4232-8232-323232323232'::uuid,
  '30303030-3030-4030-8030-303030303030'::uuid,
  '92929292-9292-4292-8292-929292929292'::uuid,
  'mvp08-collision-v1',
  candidate.alias_name,
  candidate.alias_normalized
from private.membership_alias_candidate(
  '30303030-3030-4030-8030-303030303030'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid,
  1
) candidate;

insert into public.group_memberships (id, group_id, user_id, sharing_consent_version)
values (
  '33333333-3333-4333-8333-333333333333',
  '30303030-3030-4030-8030-303030303030',
  '93939393-9393-4393-8393-939393939393',
  'mvp08-collision-v1'
);

select is(
  (
    select alias_normalized
    from public.group_memberships
    where id = '33333333-3333-4333-8333-333333333333'
  ),
  (
    with occupied as (
      select alias_normalized
      from public.group_memberships
      where group_id = '30303030-3030-4030-8030-303030303030'
        and left_at is null
        and id <> '33333333-3333-4333-8333-333333333333'
    )
    select candidate.alias_normalized
    from generate_series(0, 1024) attempt
    cross join lateral private.membership_alias_candidate(
      '30303030-3030-4030-8030-303030303030'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      attempt
    ) candidate
    where not exists (
      select 1
      from occupied
      where occupied.alias_normalized = candidate.alias_normalized
    )
    order by attempt
    limit 1
  ),
  'collision resolution deterministically picks the first free bounded attempt'
);

select results_eq(
  $$
    select (count(*) = count(distinct alias_normalized))::boolean
    from public.group_memberships
    where group_id = '30303030-3030-4030-8030-303030303030'
      and left_at is null
  $$,
  array[true],
  'active aliases stay unique per group after collision handling'
);

select results_eq(
  $$
    select (count(*) = count(distinct alias_key))::boolean
    from public.group_memberships
    where group_id = '30303030-3030-4030-8030-303030303030'
      and left_at is null
  $$,
  array[true],
  'active row keys stay unique per group after collision handling'
);

select results_eq(
  $$
    with forbidden(term) as (
      values
        ('allah'), ('muhammad'), ('ibrahim'), ('musa'), ('isa'),
        ('aisha'), ('umar'), ('ali'), ('jannah'), ('paradies'), ('heilig')
    )
    select count(*)
    from public.group_memberships membership
    join forbidden on membership.alias_normalized like '%' || forbidden.term || '%'
    where membership.group_id = '30303030-3030-4030-8030-303030303030'
      and membership.left_at is null
  $$,
  array[0::bigint],
  'stored generated aliases exclude forbidden religious names and promise terms'
);

insert into public.group_memberships (
  id, group_id, user_id, joined_at, left_at, sharing_consent_version, alias_name, alias_normalized, alias_key
) values (
  '34343434-3434-4434-8434-343434343434',
  '30303030-3030-4030-8030-303030303030',
  '95959595-9595-4595-8595-959595959595',
  now() - interval '2 days',
  now() - interval '1 day',
  'mvp08-backfill-historical-v1',
  null,
  null,
  null
);

alter table public.group_memberships disable trigger group_memberships_assign_alias_after_insert;
insert into public.group_memberships (id, group_id, user_id, sharing_consent_version)
values (
  '35353535-3535-4535-8535-353535353535',
  '30303030-3030-4030-8030-303030303030',
  '94949494-9494-4494-8494-949494949494',
  'mvp08-backfill-active-v1'
);
alter table public.group_memberships enable trigger group_memberships_assign_alias_after_insert;

select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where id = '35353535-3535-4535-8535-353535353535'
      and alias_name is null
      and alias_normalized is null
      and alias_key is null
  $$,
  array[1::bigint],
  'fixture contains one active membership without alias or row key before backfill'
);

select is(
  private.backfill_active_membership_aliases() >= 1,
  true,
  'backfill assigns aliases for active memberships with null alias fields'
);

select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where id = '35353535-3535-4535-8535-353535353535'
      and alias_name is not null
      and alias_normalized = pg_catalog.lower(private.normalise_name(alias_name))
      and alias_key is not null
  $$,
  array[1::bigint],
  'backfill fills canonical aliases and opaque row keys for active memberships'
);

select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where id = '34343434-3434-4434-8434-343434343434'
      and left_at is not null
      and alias_name is null
      and alias_normalized is null
  $$,
  array[1::bigint],
  'backfill preserves historical membership alias columns'
);

select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where id = '34343434-3434-4434-8434-343434343434'
      and left_at is not null
      and alias_key is null
  $$,
  array[1::bigint],
  'backfill preserves historical membership row keys'
);

set local role authenticated;
select throws_ok(
  $$
    select private.assign_membership_alias('33333333-3333-4333-8333-333333333333'::uuid)
  $$,
  '42501',
  null,
  'authenticated clients cannot execute private alias assignment helper (single argument)'
);
select throws_ok(
  $$
    select private.assign_membership_alias('33333333-3333-4333-8333-333333333333'::uuid, 'blocked')
  $$,
  '42501',
  null,
  'authenticated clients cannot execute private alias assignment helper (disallowed alias signature)'
);
select throws_ok(
  $$
    select *
    from private.membership_alias_candidate(
      '30303030-3030-4030-8030-303030303030'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      0
    )
  $$,
  '42501',
  null,
  'authenticated clients cannot execute private alias generator helper'
);
select throws_ok(
  $$
    select *
    from private.membership_alias_candidate_for_epoch(
      '30303030-3030-4030-8030-303030303030'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      '40404040-4040-4040-8040-404040404040'::uuid,
      0
    )
  $$,
  '42501',
  null,
  'authenticated clients cannot execute epoch-scoped private alias generator helper'
);
select throws_ok(
  $$
    select private.rotate_group_membership_aliases('30303030-3030-4030-8030-303030303030'::uuid)
  $$,
  '42501',
  null,
  'authenticated clients cannot execute private alias rotation helpers'
);
reset role;

select * from finish();
rollback;
