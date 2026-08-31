create or replace function public.get_home_summary(p_timezone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_week_start date;
  v_today_total bigint;
  v_week_total bigint;
  v_all_time_total bigint;
  v_today_goal integer;
  v_achieved_days bigint := 0;
  v_eligible_goal_days bigint := 0;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if not private.is_valid_timezone(p_timezone) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_today := (pg_catalog.now() at time zone p_timezone)::date;
  v_week_start := v_today - (extract(isodow from v_today)::integer - 1);

  select coalesce(sum(amount), 0)::bigint
    into v_today_total
  from public.salawat_entries
  where user_id = v_user_id
    and entry_date = v_today;

  select coalesce(sum(amount), 0)::bigint
    into v_week_total
  from public.salawat_entries
  where user_id = v_user_id
    and entry_date between v_week_start and v_today;

  select coalesce(sum(amount), 0)::bigint
    into v_all_time_total
  from public.salawat_entries
  where user_id = v_user_id;

  select amount
    into v_today_goal
  from public.daily_goal_versions
  where user_id = v_user_id
    and effective_from <= v_today
  order by effective_from desc
  limit 1;

  with goal_days as (
    select day::date as goal_date, goal.amount
    from pg_catalog.generate_series(
      greatest(
        v_week_start,
        coalesce((
          select min(effective_from)
          from public.daily_goal_versions
          where user_id = v_user_id
        ), v_today)
      )::timestamp,
      v_today::timestamp,
      interval '1 day'
    ) as day
    cross join lateral (
      select amount
      from public.daily_goal_versions
      where user_id = v_user_id
        and effective_from <= day::date
      order by effective_from desc
      limit 1
    ) as goal
    where goal.amount is not null
  ), daily_totals as (
    select goal_days.goal_date, goal_days.amount,
      coalesce(sum(entry.amount), 0)::bigint as total
    from goal_days
    left join public.salawat_entries entry
      on entry.user_id = v_user_id
      and entry.entry_date = goal_days.goal_date
    group by goal_days.goal_date, goal_days.amount
  )
  select count(*) filter (where total >= amount), count(*)
    into v_achieved_days, v_eligible_goal_days
  from daily_totals;

  return private.with_response_meta(jsonb_build_object(
    'today_date', v_today,
    'today_total', v_today_total::text,
    'week_start', v_week_start,
    'week_total', v_week_total::text,
    'all_time_total', v_all_time_total::text,
    'today_goal', v_today_goal::text,
    'achieved_days', v_achieved_days::text,
    'eligible_goal_days', v_eligible_goal_days::text,
    'pending_server_count', '0',
    'calculated_at', pg_catalog.clock_timestamp()
  ));
end;
$$;
