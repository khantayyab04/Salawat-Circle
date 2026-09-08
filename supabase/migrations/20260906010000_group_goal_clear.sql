-- Explicitly clearing a group goal stores a null version at the period boundary.
-- Older goal versions remain intact; owner, consent and revision checks still apply.

create or replace function public.set_group_goal(
  p_group_id uuid,
  p_period text,
  p_amount integer,
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
  v_effective_from date;
  v_today date;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_period is null or p_period not in ('week', 'month', 'all')
     or (p_amount is not null and (p_amount < 1 or p_amount > 10000000))
     or p_expected_revision is null
     or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.*
    into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
   and membership.user_id = v_user_id
   and membership.left_at is null
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and group_row.owner_user_id = v_user_id
  for update of group_row;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  v_today := (pg_catalog.now() at time zone v_group.timezone)::date;

  if p_period = 'week' then
    v_effective_from := v_today - (extract(isodow from v_today)::integer - 1);
  elsif p_period = 'month' then
    v_effective_from := date_trunc('month', v_today::timestamp)::date;
  else
    -- An all time goal has no recurring window, so it is anchored to the day
    -- the group was created and simply replaced when it changes.
    v_effective_from := (v_group.created_at at time zone v_group.timezone)::date;
  end if;

  insert into public.group_goal_versions (
    group_id, period, effective_from, amount, created_by
  ) values (
    p_group_id, p_period, v_effective_from, p_amount, v_user_id
  )
  on conflict (group_id, period, effective_from)
  do update set amount = excluded.amount, created_by = excluded.created_by,
    created_at = pg_catalog.clock_timestamp();

  update public.groups
     set revision = revision + 1,
         updated_at = pg_catalog.clock_timestamp()
   where id = p_group_id
   returning * into v_group;

  return private.with_response_meta(jsonb_build_object(
    'group_id', p_group_id,
    'period', p_period,
    'effective_from', v_effective_from,
    'amount', p_amount::text,
    'revision', v_group.revision,
    'calculated_at', pg_catalog.clock_timestamp()
  ));
end;
$$;

revoke all on function public.set_group_goal(uuid, text, integer, integer)
  from public, anon;
grant execute on function public.set_group_goal(uuid, text, integer, integer)
  to authenticated;
