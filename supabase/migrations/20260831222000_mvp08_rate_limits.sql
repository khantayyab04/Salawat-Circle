alter table private.rate_limit_buckets
  add constraint rate_limit_buckets_actor_key_not_blank check (char_length(actor_key) > 0),
  add constraint rate_limit_buckets_action_key_not_blank check (char_length(action_key) > 0);

create or replace function private.normalize_rate_limit_key(p_key text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_key text := pg_catalog.btrim(coalesce(p_key, ''));
begin
  if v_key = '' then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  return v_key;
end;
$$;

create or replace function private.rate_limit_bucket_start(
  p_now timestamptz,
  p_window_seconds integer
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_epoch bigint;
begin
  if p_now is null or p_window_seconds is null or p_window_seconds <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_epoch := floor(extract(epoch from p_now))::bigint;
  return pg_catalog.to_timestamp((v_epoch / p_window_seconds) * p_window_seconds);
end;
$$;

create or replace function private.increment_rate_limit_bucket(
  p_actor_key text,
  p_action_key text,
  p_window_key text,
  p_bucket_start timestamptz,
  p_blocked_until timestamptz
)
returns private.rate_limit_buckets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_key text := private.normalize_rate_limit_key(p_actor_key);
  v_action_key text := private.normalize_rate_limit_key(p_action_key);
  v_window_key text := private.normalize_rate_limit_key(p_window_key);
  v_bucket private.rate_limit_buckets%rowtype;
begin
  if p_bucket_start is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  insert into private.rate_limit_buckets (
    actor_key,
    action_key,
    window_key,
    bucket_start,
    hit_count,
    blocked_until
  ) values (
    v_actor_key,
    v_action_key,
    v_window_key,
    p_bucket_start,
    1,
    p_blocked_until
  )
  on conflict (actor_key, action_key, window_key, bucket_start)
  do update
  set hit_count = private.rate_limit_buckets.hit_count + 1,
      blocked_until = case
        when excluded.blocked_until is null then private.rate_limit_buckets.blocked_until
        when private.rate_limit_buckets.blocked_until is null then excluded.blocked_until
        else greatest(private.rate_limit_buckets.blocked_until, excluded.blocked_until)
      end,
      updated_at = pg_catalog.clock_timestamp()
  returning * into v_bucket;

  return v_bucket;
end;
$$;

create or replace function private.enforce_rate_limit(
  p_actor_key text,
  p_action_key text,
  p_window_key text,
  p_window_seconds integer,
  p_limit integer,
  p_now timestamptz
)
returns private.rate_limit_buckets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket private.rate_limit_buckets%rowtype;
begin
  if p_now is null or p_limit is null or p_limit <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_bucket := private.increment_rate_limit_bucket(
    p_actor_key,
    p_action_key,
    p_window_key,
    private.rate_limit_bucket_start(p_now, p_window_seconds),
    null
  );

  if v_bucket.hit_count > p_limit then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
  end if;

  return v_bucket;
end;
$$;

create or replace function private.current_rate_limit_block(
  p_actor_key text,
  p_action_key text,
  p_now timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_key text := private.normalize_rate_limit_key(p_actor_key);
  v_action_key text := private.normalize_rate_limit_key(p_action_key);
  v_blocked_until timestamptz;
begin
  if p_now is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select bucket.blocked_until
  into v_blocked_until
  from private.rate_limit_buckets bucket
  where bucket.actor_key = v_actor_key
    and bucket.action_key = v_action_key
    and bucket.blocked_until is not null
    and bucket.blocked_until > p_now
  order by bucket.blocked_until desc
  limit 1
  for update;

  return v_blocked_until;
end;
$$;

create or replace function private.consume_invite_code_check(
  p_user_id uuid,
  p_now timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action_key constant text := 'invite_code_verification';
  v_window_key constant text := 'minute';
  v_minute_limit constant integer := 5;
  v_actor_key text;
  v_bucket private.rate_limit_buckets%rowtype;
begin
  if p_user_id is null or p_now is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_actor_key := p_user_id::text;

  if private.current_rate_limit_block(v_actor_key, v_action_key, p_now) is not null then
    return 'RATE_LIMITED';
  end if;

  v_bucket := private.increment_rate_limit_bucket(
    v_actor_key,
    v_action_key,
    v_window_key,
    private.rate_limit_bucket_start(p_now, 60),
    null
  );

  if v_bucket.hit_count > v_minute_limit then
    return 'RATE_LIMITED';
  end if;

  return null;
end;
$$;

create or replace function private.record_invite_code_failure(
  p_user_id uuid,
  p_now timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action_key constant text := 'invite_code_verification';
  v_window_key constant text := 'failed_hour';
  v_failure_threshold constant integer := 20;
  v_block_duration constant interval := interval '15 minutes';
  v_actor_key text;
  v_bucket private.rate_limit_buckets%rowtype;
begin
  if p_user_id is null or p_now is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_actor_key := p_user_id::text;

  insert into private.rate_limit_buckets (
    actor_key,
    action_key,
    window_key,
    bucket_start,
    hit_count,
    blocked_until
  ) values (
    v_actor_key,
    v_action_key,
    v_window_key,
    private.rate_limit_bucket_start(p_now, 3600),
    1,
    null
  )
  on conflict (actor_key, action_key, window_key, bucket_start)
  do update
  set hit_count = private.rate_limit_buckets.hit_count + 1,
      blocked_until = case
        when private.rate_limit_buckets.hit_count + 1 >= v_failure_threshold then
          case
            when private.rate_limit_buckets.blocked_until is null then p_now + v_block_duration
            else greatest(private.rate_limit_buckets.blocked_until, p_now + v_block_duration)
          end
        else private.rate_limit_buckets.blocked_until
      end,
      updated_at = pg_catalog.clock_timestamp()
  returning * into v_bucket;

  if v_bucket.blocked_until is not null and v_bucket.blocked_until > p_now then
    return 'RATE_LIMITED';
  end if;

  return 'INVITE_INVALID';
end;
$$;

create or replace function private.invite_invalid_response(
  p_user_id uuid,
  p_is_manual_code boolean,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if p_is_manual_code then
    v_code := private.record_invite_code_failure(p_user_id, p_now);
    return private.with_response_meta(
      jsonb_build_object(
        'error',
        jsonb_build_object('code', v_code)
      )
    );
  end if;

  raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
end;
$$;

create or replace function public.create_group(
  p_client_group_id uuid,
  p_name text,
  p_timezone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := private.normalise_name(p_name);
  v_group public.groups%rowtype;
  v_membership public.group_memberships%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_client_group_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 50 or v_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;
  if not private.is_valid_timezone(p_timezone) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
  values (p_client_group_id, v_user_id, v_name, pg_catalog.lower(v_name), p_timezone)
  on conflict (id) do nothing
  returning * into v_group;

  if found then
    perform private.enforce_rate_limit(
      v_user_id::text,
      'create_group',
      'day',
      86400,
      10,
      pg_catalog.clock_timestamp()
    );
  else
    select * into v_group
    from public.groups
    where id = p_client_group_id;
  end if;

  if v_group.owner_user_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.normalized_name <> pg_catalog.lower(v_name)
     or v_group.timezone <> p_timezone then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  insert into public.group_memberships (
    group_id, user_id, sharing_consent_version
  ) values (
    v_group.id, v_user_id, 'mvp04-owner-v1'
  )
  on conflict (group_id, user_id) where left_at is null do nothing;

  select * into v_membership
  from public.group_memberships
  where group_id = v_group.id
    and user_id = v_user_id
    and left_at is null;

  if not found then
    raise exception using errcode = 'P0001', message = 'INTERNAL';
  end if;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'status', v_group.status,
      'created_at', v_group.created_at,
      'updated_at', v_group.updated_at,
      'revision', v_group.revision
    ),
    'membership', jsonb_build_object(
      'id', v_membership.id,
      'group_id', v_membership.group_id,
      'joined_at', v_membership.joined_at,
      'created_at', v_membership.created_at
    )
  ));
end;
$$;

create or replace function public.create_group_invite(
  p_group_id uuid,
  p_expires_in_days integer default 7,
  p_max_uses integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_group public.groups%rowtype;
  v_invite private.group_invites%rowtype;
  v_token text;
  v_code text;
  v_attempt integer := 0;
begin
  v_user_id := private.require_active_core_user();

  if p_expires_in_days is null or p_expires_in_days not between 1 and 30 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if p_max_uses is null or p_max_uses not between 1 and 100 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_group := private.require_owned_active_group(p_group_id, v_user_id);

  perform private.enforce_rate_limit(
    v_user_id::text,
    'create_group_invite',
    'day',
    86400,
    30,
    pg_catalog.clock_timestamp()
  );

  loop
    v_token := private.generate_group_invite_token();
    v_code := private.generate_group_invite_code();

    begin
      insert into private.group_invites (
        group_id,
        created_by,
        token_hash,
        code_hash,
        expires_at,
        max_uses
      ) values (
        v_group.id,
        v_user_id,
        private.group_invite_token_hash(v_token),
        private.group_invite_code_hash(v_code),
        pg_catalog.now() + make_interval(days => p_expires_in_days),
        p_max_uses
      )
      returning * into v_invite;
      exit;
    exception
      when unique_violation then
        v_attempt := v_attempt + 1;
        if v_attempt >= 8 then
          raise exception using errcode = 'P0001', message = 'INTERNAL';
        end if;
    end;
  end loop;

  return private.with_response_meta(jsonb_build_object(
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'group_id', v_invite.group_id,
      'token', v_token,
      'code', v_code,
      'expires_at', v_invite.expires_at,
      'max_uses', v_invite.max_uses,
      'use_count', v_invite.use_count,
      'revoked_at', v_invite.revoked_at,
      'created_at', v_invite.created_at
    )
  ));
end;
$$;

create or replace function public.preview_group_invite(
  p_kind text,
  p_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_kind text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_kind, '')));
  v_is_manual_code boolean := v_kind = 'code';
  v_invite_id uuid;
  v_invite private.group_invites%rowtype;
  v_group public.groups%rowtype;
  v_member_count integer;
  v_active_group_count integer;
  v_already_active boolean;
  v_rate_error_code text;
begin
  v_user_id := private.require_active_core_user();

  if v_is_manual_code then
    v_rate_error_code := private.consume_invite_code_check(v_user_id, pg_catalog.clock_timestamp());
    if v_rate_error_code is not null then
      return private.with_response_meta(
        jsonb_build_object('error', jsonb_build_object('code', v_rate_error_code))
      );
    end if;
  end if;

  v_invite_id := private.resolve_group_invite_id(p_kind, p_secret);

  if v_invite_id is null then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  select *
  into v_invite
  from private.group_invites invite
  where invite.id = v_invite_id;

  if not found then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  select *
  into v_group
  from public.groups group_row
  where group_row.id = v_invite.group_id;

  if not found
     or v_group.status <> 'active'
     or v_invite.revoked_at is not null
     or v_invite.expires_at <= pg_catalog.clock_timestamp()
     or v_invite.use_count >= v_invite.max_uses then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  select count(*)::integer
  into v_member_count
  from public.group_memberships membership
  where membership.group_id = v_group.id
    and membership.left_at is null;

  select exists (
    select 1
    from public.group_memberships membership
    where membership.group_id = v_group.id
      and membership.user_id = v_user_id
      and membership.left_at is null
  )
  into v_already_active;

  if not v_already_active then
    if v_member_count >= 500 then
      return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
    end if;

    select count(*)::integer
    into v_active_group_count
    from public.group_memberships membership
    join public.groups group_row
      on group_row.id = membership.group_id
    where membership.user_id = v_user_id
      and membership.left_at is null
      and group_row.status = 'active';

    if v_active_group_count >= 50 then
      return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
    end if;
  end if;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'leaderboard_anonymous', v_group.leaderboard_anonymous,
      'member_count', v_member_count
    ),
    'already_active', v_already_active
  ));
end;
$$;

create or replace function public.accept_group_invite(
  p_kind text,
  p_secret text,
  p_locale text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_kind text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_kind, '')));
  v_is_manual_code boolean := v_kind = 'code';
  v_rate_error_code text;
  v_invite_id uuid;
  v_invite private.group_invites%rowtype;
  v_group public.groups%rowtype;
  v_membership public.group_memberships%rowtype;
  v_member_count integer;
  v_active_group_count integer;
  v_joined_at timestamptz := pg_catalog.clock_timestamp();
  v_already_active boolean := false;
begin
  v_user_id := private.require_active_core_user();

  if p_locale not in ('de', 'en') then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_is_manual_code then
    v_rate_error_code := private.consume_invite_code_check(v_user_id, pg_catalog.clock_timestamp());
    if v_rate_error_code is not null then
      return private.with_response_meta(
        jsonb_build_object('error', jsonb_build_object('code', v_rate_error_code))
      );
    end if;
  end if;

  v_invite_id := private.resolve_group_invite_id(p_kind, p_secret);
  if v_invite_id is null then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  select *
  into v_invite
  from private.group_invites invite
  where invite.id = v_invite_id
  for update;

  if not found then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  perform 1
  from public.profiles profile_row
  where profile_row.id = v_user_id
  for update;

  select *
  into v_group
  from public.groups group_row
  where group_row.id = v_invite.group_id
  for update;

  if not found then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  select *
  into v_membership
  from public.group_memberships membership
  where membership.group_id = v_group.id
    and membership.user_id = v_user_id
    and membership.left_at is null;

  if found then
    select count(*)::integer
    into v_member_count
    from public.group_memberships membership
    where membership.group_id = v_group.id
      and membership.left_at is null;

    return private.with_response_meta(jsonb_build_object(
      'group', jsonb_build_object(
        'id', v_group.id,
        'name', v_group.name,
        'timezone', v_group.timezone,
        'leaderboard_anonymous', v_group.leaderboard_anonymous,
        'member_count', v_member_count
      ),
      'membership', jsonb_build_object(
        'id', v_membership.id,
        'group_id', v_membership.group_id,
        'joined_at', v_membership.joined_at,
        'created_at', v_membership.created_at,
        'sharing_consent_version', v_membership.sharing_consent_version
      ),
      'already_active', true
    ));
  end if;

  if v_group.status <> 'active'
     or v_invite.revoked_at is not null
     or v_invite.expires_at <= pg_catalog.clock_timestamp()
     or v_invite.use_count >= v_invite.max_uses then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  if exists (
    select 1
    from private.group_invite_uses invite_use
    where invite_use.invite_id = v_invite.id
      and invite_use.user_id = v_user_id
  ) then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  select count(*)::integer
  into v_member_count
  from public.group_memberships membership
  where membership.group_id = v_group.id
    and membership.left_at is null;

  if v_member_count >= 500 then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  select count(*)::integer
  into v_active_group_count
  from public.group_memberships membership
  join public.groups group_row
    on group_row.id = membership.group_id
  where membership.user_id = v_user_id
    and membership.left_at is null
    and group_row.status = 'active';

  if v_active_group_count >= 50 then
    return private.invite_invalid_response(v_user_id, v_is_manual_code, pg_catalog.clock_timestamp());
  end if;

  begin
    insert into public.group_memberships (
      group_id,
      user_id,
      joined_at,
      invite_id,
      sharing_consent_version
    ) values (
      v_group.id,
      v_user_id,
      v_joined_at,
      v_invite.id,
      'mvp08-group-sharing-v1'
    )
    on conflict (group_id, user_id) where left_at is null do nothing
    returning * into v_membership;

    if not found then
      select *
      into v_membership
      from public.group_memberships membership
      where membership.group_id = v_group.id
        and membership.user_id = v_user_id
        and membership.left_at is null;

      if found then
        v_already_active := true;
      end if;
    end if;

    if not found and not v_already_active then
      raise exception using errcode = 'P0001', message = 'INTERNAL';
    end if;

    insert into private.consent_records (
      user_id,
      consent_type,
      document_version,
      locale
    ) values (
      v_user_id,
      'group_sharing',
      'mvp08-group-sharing-v1',
      p_locale
    )
    on conflict (user_id, consent_type, document_version) do nothing;

    if not v_already_active then
      insert into private.group_invite_uses (
        invite_id,
        user_id,
        membership_id,
        used_at
      ) values (
        v_invite.id,
        v_user_id,
        v_membership.id,
        v_joined_at
      )
      on conflict (invite_id, user_id) do nothing;

      if not found then
        raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
      end if;

      update private.group_invites invite
      set use_count = invite.use_count + 1
      where invite.id = v_invite.id
        and invite.use_count < invite.max_uses
      returning * into v_invite;

      if not found then
        raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
      end if;
    end if;
  exception
    when sqlstate 'P0001' then
      if v_is_manual_code and sqlerrm = 'INVITE_INVALID' then
        return private.invite_invalid_response(v_user_id, true, pg_catalog.clock_timestamp());
      end if;

      raise;
  end;

  select *
  into v_membership
  from public.group_memberships membership
  where membership.id = v_membership.id;

  select count(*)::integer
  into v_member_count
  from public.group_memberships membership
  where membership.group_id = v_group.id
    and membership.left_at is null;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'leaderboard_anonymous', v_group.leaderboard_anonymous,
      'member_count', v_member_count
    ),
    'membership', jsonb_build_object(
      'id', v_membership.id,
      'group_id', v_membership.group_id,
      'joined_at', v_membership.joined_at,
      'created_at', v_membership.created_at,
      'sharing_consent_version', v_membership.sharing_consent_version
    ),
    'already_active', v_already_active
  ));
end;
$$;

revoke all on function private.normalize_rate_limit_key(text) from public, anon, authenticated;
revoke all on function private.rate_limit_bucket_start(timestamptz, integer) from public, anon, authenticated;
revoke all on function private.increment_rate_limit_bucket(text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function private.enforce_rate_limit(text, text, text, integer, integer, timestamptz) from public, anon, authenticated;
revoke all on function private.current_rate_limit_block(text, text, timestamptz) from public, anon, authenticated;
revoke all on function private.consume_invite_code_check(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.record_invite_code_failure(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.invite_invalid_response(uuid, boolean, timestamptz) from public, anon, authenticated;
