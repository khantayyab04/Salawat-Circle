begin;

create extension if not exists pgtap with schema extensions;
select plan(33);

select has_function(
  'private',
  'rate_limit_bucket_start',
  array['timestamp with time zone', 'integer'],
  'rate-limit bucket start helper exists'
);
select has_function(
  'private',
  'enforce_rate_limit',
  array['text', 'text', 'text', 'integer', 'integer', 'timestamp with time zone'],
  'rate-limit enforcement helper exists'
);
select has_function(
  'private',
  'consume_invite_code_check',
  array['uuid', 'timestamp with time zone'],
  'manual code check limiter helper exists'
);
select has_function(
  'private',
  'record_invite_code_failure',
  array['uuid', 'timestamp with time zone'],
  'manual code failure limiter helper exists'
);
select has_function(
  'private',
  'invite_invalid_response',
  array['uuid', 'boolean', 'timestamp with time zone'],
  'manual code neutral error response helper exists'
);

set local role authenticated;
select throws_ok(
  $$ select private.enforce_rate_limit('actor', 'action', 'window', 60, 1, pg_catalog.clock_timestamp()) $$,
  '42501',
  null,
  'authenticated clients cannot execute private rate-limit helpers'
);
reset role;

select throws_ok(
  $$
    insert into private.rate_limit_buckets (actor_key, action_key, window_key, bucket_start, hit_count)
    values ('', 'create_group', 'day', pg_catalog.clock_timestamp(), 0)
  $$,
  '23514',
  null,
  'rate-limit buckets reject blank actor keys'
);
select throws_ok(
  $$
    insert into private.rate_limit_buckets (actor_key, action_key, window_key, bucket_start, hit_count)
    values ('actor', '', 'day', pg_catalog.clock_timestamp(), 0)
  $$,
  '23514',
  null,
  'rate-limit buckets reject blank action keys'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'mvp08-rate-owner@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'mvp08-rate-mixed@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'mvp08-rate-invalid@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'mvp08-rate-groups@example.test', '', now(), now(), now());

insert into public.profiles (id, display_name, normalized_name)
values
  ('11111111-1111-4111-8111-111111111111', 'Rate Owner', 'rate owner'),
  ('22222222-2222-4222-8222-222222222222', 'Rate Mixed', 'rate mixed'),
  ('33333333-3333-4333-8333-333333333333', 'Rate Invalid', 'rate invalid'),
  ('44444444-4444-4444-8444-444444444444', 'Rate Groups', 'rate groups');

insert into private.consent_records (user_id, consent_type, document_version, locale)
values
  ('11111111-1111-4111-8111-111111111111', 'core_processing', 'mvp-core-v1', 'de'),
  ('22222222-2222-4222-8222-222222222222', 'core_processing', 'mvp-core-v1', 'de'),
  ('33333333-3333-4333-8333-333333333333', 'core_processing', 'mvp-core-v1', 'de'),
  ('44444444-4444-4444-8444-444444444444', 'core_processing', 'mvp-core-v1', 'de');

insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  'Rate Limit Group',
  'rate limit group',
  'Europe/Berlin'
);

insert into public.group_memberships (group_id, user_id, sharing_consent_version)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'mvp08-owner-v1'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '22222222-2222-4222-8222-222222222222', 'mvp08-existing-v1');

insert into private.group_invites (
  id,
  group_id,
  created_by,
  token_hash,
  code_hash,
  expires_at,
  max_uses,
  use_count,
  created_at
)
values (
  'bbbbbbbb-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  private.group_invite_token_hash(repeat('A', 43)),
  private.group_invite_code_hash('ABCD2345EF'),
  now() + interval '1 day',
  25,
  0,
  now() - interval '1 hour'
);

delete from private.rate_limit_buckets
where actor_key = '33333333-3333-4333-8333-333333333333'
  and action_key = 'invite_code_verification';

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
create temp table invalid_preview as
select public.preview_group_invite('code', 'ZZZZ2345ZZ') as response;
select ok(
  (select response ?& array['error', 'request_id', 'server_time'] from invalid_preview),
  'invalid manual preview returns neutral structured envelope'
);
select is(
  (select response->'error'->>'code' from invalid_preview),
  'INVITE_INVALID',
  'invalid manual preview returns neutral INVITE_INVALID error code'
);
select ok(
  (select not (response ? 'group') from invalid_preview),
  'invalid manual preview does not expose group metadata'
);
reset role;

select results_eq(
  $$
    select coalesce(sum(hit_count), 0)::bigint
    from private.rate_limit_buckets
    where actor_key = '33333333-3333-4333-8333-333333333333'
      and action_key = 'invite_code_verification'
      and window_key = 'failed_hour'
  $$,
  array[1::bigint],
  'invalid manual preview persists one failed-attempt bucket hit'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
create temp table invalid_accept as
select public.accept_group_invite('code', 'QQQQ2345QQ', 'de') as response;
select is(
  (select response->'error'->>'code' from invalid_accept),
  'INVITE_INVALID',
  'invalid manual accept returns neutral INVITE_INVALID error code'
);
reset role;

select results_eq(
  $$
    select coalesce(sum(hit_count), 0)::bigint
    from private.rate_limit_buckets
    where actor_key = '33333333-3333-4333-8333-333333333333'
      and action_key = 'invite_code_verification'
      and window_key = 'failed_hour'
  $$,
  array[2::bigint],
  'invalid manual accept persists another failed-attempt hit'
);

create temp table failed_hour_window as
select private.rate_limit_bucket_start(pg_catalog.clock_timestamp(), 3600) as bucket_start;

delete from private.rate_limit_buckets
where actor_key = '33333333-3333-4333-8333-333333333333'
  and action_key = 'invite_code_verification'
  and window_key = 'failed_hour';

insert into private.rate_limit_buckets (actor_key, action_key, window_key, bucket_start, hit_count, blocked_until)
select
  '33333333-3333-4333-8333-333333333333',
  'invite_code_verification',
  'failed_hour',
  bucket_start,
  19,
  null
from failed_hour_window;

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
create temp table threshold_hit as
select public.preview_group_invite('code', 'MMMM2345MN') as response;
select is(
  (select response->'error'->>'code' from threshold_hit),
  'RATE_LIMITED',
  'twentieth failed manual code attempt returns RATE_LIMITED'
);
reset role;

select ok(
  (
    select hit_count = 20
    from private.rate_limit_buckets
    where actor_key = '33333333-3333-4333-8333-333333333333'
      and action_key = 'invite_code_verification'
      and window_key = 'failed_hour'
      and bucket_start = (select bucket_start from failed_hour_window)
  ),
  'manual code failure threshold increments one-hour bucket to twenty hits'
);
select ok(
  (
    select blocked_until > pg_catalog.clock_timestamp() + interval '14 minutes'
      and blocked_until <= pg_catalog.clock_timestamp() + interval '16 minutes'
    from private.rate_limit_buckets
    where actor_key = '33333333-3333-4333-8333-333333333333'
      and action_key = 'invite_code_verification'
      and window_key = 'failed_hour'
      and bucket_start = (select bucket_start from failed_hour_window)
  ),
  'manual code failure threshold sets a temporary block around fifteen minutes'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
create temp table blocked_valid_attempt as
select public.preview_group_invite('code', 'ABCD2345EF') as response;
select is(
  (select response->'error'->>'code' from blocked_valid_attempt),
  'RATE_LIMITED',
  'manual code checks remain blocked even when code itself is valid'
);
reset role;

update private.rate_limit_buckets
set blocked_until = pg_catalog.clock_timestamp() - interval '1 second'
where actor_key = '33333333-3333-4333-8333-333333333333'
  and action_key = 'invite_code_verification'
  and window_key = 'failed_hour'
  and bucket_start = (select bucket_start from failed_hour_window);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '33333333-3333-4333-8333-333333333333';
create temp table unblocked_valid_attempt as
select public.preview_group_invite('code', 'ABCD2345EF') as response;
select ok(
  (
    select response ? 'group' and not (response ? 'error')
    from unblocked_valid_attempt
  ),
  'manual code checks succeed again after temporary block expiry'
);
reset role;

delete from private.rate_limit_buckets
where actor_key = '22222222-2222-4222-8222-222222222222'
  and action_key = 'invite_code_verification';

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
create temp table mixed_check_1 as
select public.preview_group_invite('code', 'ABCD2345EF') as response;
create temp table mixed_check_2 as
select public.accept_group_invite('code', 'ABCD2345EF', 'de') as response;
create temp table mixed_check_3 as
select public.preview_group_invite('code', 'ABCD2345EF') as response;
create temp table mixed_check_4 as
select public.accept_group_invite('code', 'ABCD2345EF', 'de') as response;
create temp table mixed_check_5 as
select public.preview_group_invite('code', 'ABCD2345EF') as response;
create temp table mixed_check_6 as
select public.accept_group_invite('code', 'ABCD2345EF', 'de') as response;
select ok(
  (
    select bool_and(not (response ? 'error'))
    from (
      select response from mixed_check_1
      union all select response from mixed_check_2
      union all select response from mixed_check_3
      union all select response from mixed_check_4
      union all select response from mixed_check_5
    ) responses
  ),
  'first five manual checks across preview and accept are allowed'
);
select is(
  (select response->'error'->>'code' from mixed_check_6),
  'RATE_LIMITED',
  'sixth manual check in the same minute is rate limited'
);
reset role;

select results_eq(
  $$
    select coalesce(sum(hit_count), 0)::bigint
    from private.rate_limit_buckets
    where actor_key = '22222222-2222-4222-8222-222222222222'
      and action_key = 'invite_code_verification'
      and window_key = 'minute'
  $$,
  array[6::bigint],
  'preview and accept both persist manual code minute-check counts'
);

delete from private.rate_limit_buckets
where actor_key = '22222222-2222-4222-8222-222222222222'
  and action_key = 'invite_code_verification'
  and window_key = 'minute';

create temp table rollover_seed as
select private.rate_limit_bucket_start(pg_catalog.clock_timestamp(), 60) - interval '1 minute' as bucket_start;

insert into private.rate_limit_buckets (actor_key, action_key, window_key, bucket_start, hit_count)
select
  '22222222-2222-4222-8222-222222222222',
  'invite_code_verification',
  'minute',
  bucket_start,
  5
from rollover_seed;

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
create temp table rollover_check as
select public.preview_group_invite('code', 'ABCD2345EF') as response;
select ok(
  (select not (response ? 'error') from rollover_check),
  'manual code limiter resets on the next minute bucket'
);
reset role;

select results_eq(
  $$
    select count(*)::bigint
    from private.rate_limit_buckets
    where actor_key = '22222222-2222-4222-8222-222222222222'
      and action_key = 'invite_code_verification'
      and window_key = 'minute'
  $$,
  array[2::bigint],
  'manual code limiter creates a fresh minute bucket after rollover'
);
select results_eq(
  $$
    select coalesce(sum(hit_count), 0)::bigint
    from private.rate_limit_buckets
    where actor_key = '22222222-2222-4222-8222-222222222222'
      and action_key = 'invite_code_verification'
      and window_key = 'minute'
      and bucket_start <> (select bucket_start from rollover_seed)
  $$,
  array[1::bigint],
  'new minute bucket starts counting from one hit'
);

create temp table day_window as
select private.rate_limit_bucket_start(pg_catalog.clock_timestamp(), 86400) as bucket_start;

delete from private.rate_limit_buckets
where actor_key = '11111111-1111-4111-8111-111111111111'
  and action_key = 'create_group_invite'
  and window_key = 'day';

insert into private.rate_limit_buckets (actor_key, action_key, window_key, bucket_start, hit_count)
select
  '11111111-1111-4111-8111-111111111111',
  'create_group_invite',
  'day',
  bucket_start,
  29
from day_window;

create temp table invite_count_before as
select count(*)::bigint as count_before
from private.group_invites
where group_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
select lives_ok(
  $$ select public.create_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') $$,
  'thirtieth invite creation in the day still succeeds'
);
select throws_ok(
  $$ select public.create_group_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') $$,
  'P0001',
  'RATE_LIMITED',
  'thirty-first invite creation in the day is rejected'
);
reset role;

select results_eq(
  $$
    select count(*)::bigint
    from private.group_invites
    where group_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  $$,
  $$
    select count_before + 1
    from invite_count_before
  $$,
  'invite creation limit only persists the successful thirtieth invite'
);
select results_eq(
  $$
    select hit_count
    from private.rate_limit_buckets
    where actor_key = '11111111-1111-4111-8111-111111111111'
      and action_key = 'create_group_invite'
      and window_key = 'day'
      and bucket_start = (select bucket_start from day_window)
  $$,
  array[30],
  'invite creation day bucket remains at thirty hits after rejection'
);

delete from private.rate_limit_buckets
where actor_key = '44444444-4444-4444-8444-444444444444'
  and action_key = 'create_group'
  and window_key = 'day';

insert into private.rate_limit_buckets (actor_key, action_key, window_key, bucket_start, hit_count)
select
  '44444444-4444-4444-8444-444444444444',
  'create_group',
  'day',
  bucket_start,
  9
from day_window;

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '44444444-4444-4444-8444-444444444444';
select lives_ok(
  $$ select public.create_group('dddddddd-0000-4000-8000-000000000001', 'Rate Group 1', 'Europe/Berlin') $$,
  'tenth group creation in the day still succeeds'
);
select throws_ok(
  $$ select public.create_group('dddddddd-0000-4000-8000-000000000002', 'Rate Group 2', 'Europe/Berlin') $$,
  'P0001',
  'RATE_LIMITED',
  'eleventh group creation in the day is rejected'
);
reset role;

select results_eq(
  $$
    select count(*)::bigint
    from public.groups
    where owner_user_id = '44444444-4444-4444-8444-444444444444'
  $$,
  array[1::bigint],
  'group creation limit only persists the successful tenth group'
);
select results_eq(
  $$
    select hit_count
    from private.rate_limit_buckets
    where actor_key = '44444444-4444-4444-8444-444444444444'
      and action_key = 'create_group'
      and window_key = 'day'
      and bucket_start = (select bucket_start from day_window)
  $$,
  array[10],
  'group creation day bucket remains at ten hits after rejection'
);

select * from finish();
rollback;
