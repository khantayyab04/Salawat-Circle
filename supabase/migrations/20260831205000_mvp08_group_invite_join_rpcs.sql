do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_enum enum_value
    where enum_value.enumtypid = 'private.consent_type'::pg_catalog.regtype
      and enum_value.enumlabel = 'group_sharing'
  ) then
    alter type private.consent_type add value 'group_sharing';
  end if;
end;
$$;

create or replace function private.resolve_group_invite_id(
  p_kind text,
  p_secret text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kind text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_kind, '')));
  v_invite_id uuid;
  v_error_message text;
begin
  if v_kind not in ('token', 'code') then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  begin
    if v_kind = 'token' then
      select invite.id
      into v_invite_id
      from private.group_invites invite
      where invite.token_hash = private.group_invite_token_hash(p_secret);
    else
      select invite.id
      into v_invite_id
      from private.group_invites invite
      where invite.code_hash = private.group_invite_code_hash(p_secret);
    end if;
  exception
    when sqlstate 'P0001' then
      get stacked diagnostics v_error_message = message_text;
      if v_error_message = 'INVALID_INPUT' then
        return null;
      end if;
      raise;
  end;

  return v_invite_id;
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
  v_invite_id uuid;
  v_invite private.group_invites%rowtype;
  v_group public.groups%rowtype;
  v_member_count integer;
  v_active_group_count integer;
  v_already_active boolean;
begin
  v_user_id := private.require_active_core_user();
  v_invite_id := private.resolve_group_invite_id(p_kind, p_secret);

  if v_invite_id is null then
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
  end if;

  select *
  into v_invite
  from private.group_invites invite
  where invite.id = v_invite_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
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
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
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
      raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
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
      raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
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

  v_invite_id := private.resolve_group_invite_id(p_kind, p_secret);
  if v_invite_id is null then
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
  end if;

  select *
  into v_invite
  from private.group_invites invite
  where invite.id = v_invite_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
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
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
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
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
  end if;

  if exists (
    select 1
    from private.group_invite_uses invite_use
    where invite_use.invite_id = v_invite.id
      and invite_use.user_id = v_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
  end if;

  select count(*)::integer
  into v_member_count
  from public.group_memberships membership
  where membership.group_id = v_group.id
    and membership.left_at is null;

  if v_member_count >= 500 then
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
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
    raise exception using errcode = 'P0001', message = 'INVITE_INVALID';
  end if;

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

revoke all on function private.resolve_group_invite_id(text, text) from public, anon, authenticated;

revoke all on function public.preview_group_invite(text, text) from public, anon;
revoke all on function public.accept_group_invite(text, text, text) from public, anon;

grant execute on function public.preview_group_invite(text, text) to authenticated;
grant execute on function public.accept_group_invite(text, text, text) to authenticated;
