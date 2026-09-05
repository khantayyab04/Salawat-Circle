create or replace function public.get_group_insights(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_today date;
  v_week_start date;
  v_week_end date;
  v_active_members integer;
  v_week_total bigint;
  v_goal integer;
  v_remaining bigint;
  v_days_remaining integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  select group_row.*
    into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
   and membership.user_id = v_user_id
   and membership.left_at is null
  where group_row.id = p_group_id
    and group_row.status = 'active';
  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  v_today := (pg_catalog.now() at time zone v_group.timezone)::date;
  v_week_start := v_today - (extract(isodow from v_today)::integer - 1);
  v_week_end := v_week_start + 6;
  v_days_remaining := v_week_end - v_today + 1;

  select count(*)::integer
    into v_active_members
  from public.group_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.group_id = p_group_id
    and membership.left_at is null
    and profile.status = 'active';

  select coalesce(sum(entry.amount), 0)::bigint
    into v_week_total
  from public.salawat_entries entry
  join public.group_memberships membership
    on membership.user_id = entry.user_id
   and membership.group_id = p_group_id
   and membership.left_at is null
   and entry.recorded_at_client >= membership.joined_at
  join public.profiles profile
    on profile.id = membership.user_id
   and profile.status = 'active'
  where entry.entry_date between v_week_start and v_today;

  select amount
    into v_goal
  from public.group_goal_versions
  where group_id = p_group_id
    and period = 'week'
    and effective_from <= v_week_start
  order by effective_from desc
  limit 1;

  v_remaining := case
    when v_goal is null then null
    else greatest(v_goal::bigint - v_week_total, 0)
  end;

  return private.with_response_meta(jsonb_build_object(
    'group_id', p_group_id,
    'week_start', v_week_start,
    'week_end', v_week_end,
    'week_total', v_week_total::text,
    'active_members', v_active_members::text,
    'weekly_average', case when v_active_members > 0
      then (v_week_total / v_active_members)::text
      else null
    end,
    'goal_amount', v_goal::text,
    'remaining', v_remaining::text,
    'days_remaining', v_days_remaining,
    'per_person_remaining', case
      when v_remaining is null or v_active_members = 0 then null
      else ceil(v_remaining::numeric / v_active_members)::bigint::text
    end,
    'per_person_per_day', case
      when v_remaining is null or v_active_members = 0 then null
      else ceil(v_remaining::numeric / (v_active_members * v_days_remaining))::bigint::text
    end,
    'calculated_at', pg_catalog.clock_timestamp()
  ));
end;
$$;

revoke all on function public.get_group_insights(uuid) from public, anon;
grant execute on function public.get_group_insights(uuid) to authenticated;
