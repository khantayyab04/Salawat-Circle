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
    -- Every membership change locks the group first, including invite acceptance.
    -- Include suspended members here: they may regain access later.
    if exists (select 1 from public.group_memberships
      where group_id=v_group.id and left_at is null and user_id<>v_user_id) then
      raise exception using errcode = 'P0001', message = 'OWNER_MUST_TRANSFER';
    end if;
    select * into v_membership from public.group_memberships
      where group_id=v_group.id and user_id=v_user_id and left_at is null;
    delete from public.groups where id=v_group.id;
    return private.with_response_meta(jsonb_build_object(
      'group_id', v_group.id, 'membership_id', v_membership.id));
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
