create or replace function private.group_member_rows(
  p_group_id uuid,
  p_viewer_user_id uuid,
  p_leaderboard_anonymous boolean
)
returns table (
  membership_id uuid,
  display_name text,
  sort_name text,
  role text,
  joined_at timestamptz,
  is_self boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.id,
    case
      when p_leaderboard_anonymous and membership.user_id <> p_viewer_user_id
        then coalesce(membership.alias_name, 'Mitglied')
      else profile.display_name
    end,
    case
      when p_leaderboard_anonymous
        then coalesce(
          membership.alias_normalized,
          pg_catalog.lower(
            private.normalise_name(coalesce(membership.alias_name, 'Mitglied'))
          )
        )
      else profile.normalized_name
    end,
    case
      when group_row.owner_user_id = membership.user_id then 'owner'
      else 'member'
    end,
    membership.joined_at,
    membership.user_id = p_viewer_user_id
  from public.group_memberships membership
  join public.groups group_row on group_row.id = membership.group_id
  join public.profiles profile on profile.id = membership.user_id
  where membership.group_id = p_group_id
    and membership.left_at is null
    and profile.status = 'active';
$$;

create or replace function public.list_group_members(
  p_group_id uuid,
  p_cursor_sort_name text default null,
  p_cursor_membership_id uuid default null,
  p_limit integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_items jsonb;
  v_next_cursor jsonb;
  v_has_more boolean;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_group_id is null
     or p_limit is null
     or p_limit not between 1 and 50
     or (p_cursor_sort_name is null) <> (p_cursor_membership_id is null) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.* into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and membership.user_id = v_user_id
    and membership.left_at is null;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  with rows as materialized (
    select *
    from private.group_member_rows(
      v_group.id,
      v_user_id,
      v_group.leaderboard_anonymous
    )
  ), cursor_row as materialized (
    select role = 'owner' as is_owner
    from rows
    where membership_id = p_cursor_membership_id
  ), page as materialized (
    select rows.*
    from rows
    left join cursor_row on true
    where p_cursor_sort_name is null
      or (
        cursor_row.is_owner is not null
        and (
          (rows.role = 'owner') < cursor_row.is_owner
          or (
            (rows.role = 'owner') = cursor_row.is_owner
            and (rows.sort_name, rows.membership_id)
              > (p_cursor_sort_name, p_cursor_membership_id)
          )
        )
      )
    order by (rows.role = 'owner') desc, rows.sort_name, rows.membership_id
    limit p_limit + 1
  ), visible as materialized (
    select *
    from page
    order by (role = 'owner') desc, sort_name, membership_id
    limit p_limit
  )
  select
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'membership_id', membership_id,
          'display_name', display_name,
          'role', role,
          'joined_at', joined_at,
          'is_self', is_self
        ) order by (role = 'owner') desc, sort_name, membership_id)
        from visible
      ),
      '[]'::jsonb
    ),
    case when exists (select 1 from page offset p_limit) then (
      select jsonb_build_object(
        'sort_name', sort_name,
        'membership_id', membership_id
      )
      from visible
      order by (role = 'owner') asc, sort_name desc, membership_id desc
      limit 1
    ) else null end,
    exists (select 1 from page offset p_limit)
  into v_items, v_next_cursor, v_has_more;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'leaderboard_anonymous', v_group.leaderboard_anonymous,
      'revision', v_group.revision
    ),
    'items', v_items,
    'next_cursor', v_next_cursor,
    'has_more', v_has_more
  ));
end;
$$;

revoke all on function private.group_member_rows(uuid, uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.list_group_members(uuid, text, uuid, integer)
  from public, anon;
grant execute on function public.list_group_members(uuid, text, uuid, integer)
  to authenticated;

create or replace function public.remove_group_member(
  p_group_id uuid,
  p_membership_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_membership public.group_memberships%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_group_id is null
     or p_membership_id is null
     or p_expected_revision is null
     or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.* into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and group_row.owner_user_id = v_user_id
    and membership.user_id = v_user_id
    and membership.left_at is null
  for update of group_row;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  select * into v_membership
  from public.group_memberships
  where id = p_membership_id
    and group_id = v_group.id
    and left_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_membership.user_id = v_user_id then
    raise exception using errcode = 'P0001', message = 'OWNER_MUST_TRANSFER';
  end if;

  perform private.enforce_rate_limit(
    v_user_id::text,
    'remove_group_member',
    'day',
    86400,
    50,
    pg_catalog.clock_timestamp()
  );

  update public.group_memberships
  set left_at = pg_catalog.clock_timestamp()
  where id = v_membership.id;

  update public.groups
  set revision = revision + 1,
      updated_at = pg_catalog.clock_timestamp()
  where id = v_group.id
    and revision = p_expected_revision
  returning * into v_group;

  if not found then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'status', v_group.status,
      'leaderboard_anonymous', v_group.leaderboard_anonymous,
      'created_at', v_group.created_at,
      'updated_at', v_group.updated_at,
      'revision', v_group.revision
    ),
    'membership_id', v_membership.id
  ));
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_membership public.group_memberships%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_group_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.* into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and membership.user_id = v_user_id
    and membership.left_at is null
  for update of group_row;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.owner_user_id = v_user_id then
    raise exception using errcode = 'P0001', message = 'OWNER_MUST_TRANSFER';
  end if;

  update public.group_memberships
  set left_at = pg_catalog.clock_timestamp()
  where group_id = v_group.id
    and user_id = v_user_id
    and left_at is null
  returning * into v_membership;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  return private.with_response_meta(jsonb_build_object(
    'group_id', v_group.id,
    'membership_id', v_membership.id
  ));
end;
$$;

create or replace function public.transfer_group_ownership(
  p_group_id uuid,
  p_membership_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_membership public.group_memberships%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_group_id is null
     or p_membership_id is null
     or p_expected_revision is null
     or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.* into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and group_row.owner_user_id = v_user_id
    and membership.user_id = v_user_id
    and membership.left_at is null
  for update of group_row;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  select * into v_membership
  from public.group_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.id = p_membership_id
    and membership.group_id = v_group.id
    and membership.left_at is null
    and profile.status = 'active'
  for update;

  if not found or v_membership.user_id = v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  perform private.enforce_rate_limit(
    v_user_id::text,
    'transfer_group_ownership',
    'day',
    86400,
    10,
    pg_catalog.clock_timestamp()
  );

  update public.groups
  set owner_user_id = v_membership.user_id,
      revision = revision + 1,
      updated_at = pg_catalog.clock_timestamp()
  where id = v_group.id
    and revision = p_expected_revision
  returning * into v_group;

  if not found then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'status', v_group.status,
      'leaderboard_anonymous', v_group.leaderboard_anonymous,
      'created_at', v_group.created_at,
      'updated_at', v_group.updated_at,
      'revision', v_group.revision
    )
  ));
end;
$$;

create or replace function public.delete_group(
  p_group_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_group_id is null
     or p_expected_revision is null
     or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.* into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and group_row.owner_user_id = v_user_id
    and membership.user_id = v_user_id
    and membership.left_at is null
  for update of group_row;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  perform private.enforce_rate_limit(
    v_user_id::text,
    'delete_group',
    'day',
    86400,
    10,
    pg_catalog.clock_timestamp()
  );

  delete from public.groups
  where id = v_group.id
    and revision = p_expected_revision;

  if not found then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  return private.with_response_meta(jsonb_build_object('group_id', p_group_id));
end;
$$;

revoke all on function public.remove_group_member(uuid, uuid, integer)
  from public, anon;
revoke all on function public.leave_group(uuid)
  from public, anon;
revoke all on function public.transfer_group_ownership(uuid, uuid, integer)
  from public, anon;
revoke all on function public.delete_group(uuid, integer)
  from public, anon;
grant execute on function public.remove_group_member(uuid, uuid, integer)
  to authenticated;
grant execute on function public.leave_group(uuid)
  to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid, integer)
  to authenticated;
grant execute on function public.delete_group(uuid, integer)
  to authenticated;

create or replace function public.update_group_name(
  p_group_id uuid,
  p_name text,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_group public.groups%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  v_name := private.normalise_group_name(p_name);
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.* into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and group_row.owner_user_id = v_user_id
    and membership.user_id = v_user_id
    and membership.left_at is null
  for update of group_row;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  if v_group.normalized_name <> pg_catalog.lower(v_name) then
    update public.groups
    set name = v_name,
        normalized_name = pg_catalog.lower(v_name),
        updated_at = pg_catalog.clock_timestamp(),
        revision = revision + 1
    where id = p_group_id
      and revision = p_expected_revision
    returning * into v_group;

    if not found then
      raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
    end if;
  end if;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'status', v_group.status,
      'leaderboard_anonymous', v_group.leaderboard_anonymous,
      'created_at', v_group.created_at,
      'updated_at', v_group.updated_at,
      'revision', v_group.revision
    )
  ));
end;
$$;

revoke all on function public.update_group_name(uuid, text, integer)
  from public, anon;
grant execute on function public.update_group_name(uuid, text, integer)
  to authenticated;
