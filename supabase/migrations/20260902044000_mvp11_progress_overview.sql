create or replace function public.get_progress_overview(
  p_timezone text,
  p_days integer default 35
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_start date;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if not private.is_valid_timezone(p_timezone)
     or p_days < 1
     or p_days > 365 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_today := (pg_catalog.now() at time zone p_timezone)::date;
  v_start := v_today - (p_days - 1);

  with daily as (
    select
      day::date as entry_date,
      coalesce((
        select sum(entry.amount)::bigint
        from public.salawat_entries entry
        where entry.user_id = v_user_id
          and entry.entry_date = day::date
      ), 0) as total,
      goal.amount as goal
    from pg_catalog.generate_series(
      v_start::timestamp,
      v_today::timestamp,
      interval '1 day'
    ) day
    left join lateral (
      select amount
      from public.daily_goal_versions
      where user_id = v_user_id
        and effective_from <= day::date
      order by effective_from desc
      limit 1
    ) goal on true
  ), stats as (
    select
      count(*) filter (where total > 0) as active_days,
      count(*) filter (where goal is not null) as goal_days,
      count(*) filter (where goal is not null and total >= goal) as achieved_goal_days,
      coalesce(sum(total), 0)::bigint as period_total,
      max(total) as best_day_total,
      (array_agg(entry_date order by total desc, entry_date desc))[1] as best_day_date
    from daily
  )
  select private.with_response_meta(jsonb_build_object(
    'period_start', v_start,
    'period_end', v_today,
    'total', stats.period_total::text,
    'active_days', stats.active_days::text,
    'goal_days', stats.goal_days::text,
    'achieved_goal_days', stats.achieved_goal_days::text,
    'average_per_active_day',
      case when stats.active_days > 0
        then (stats.period_total / stats.active_days)::text
        else null
      end,
    'best_day', case when stats.best_day_total > 0 then jsonb_build_object(
      'date', stats.best_day_date,
      'total', stats.best_day_total::text
    ) else null end,
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'date', entry_date,
        'total', total::text,
        'goal', goal::text,
        'goal_reached', case when goal is null then null else total >= goal end,
        'remaining', case when goal is null then null else greatest(goal - total, 0)::text end
      ) order by entry_date)
      from daily
    ),
    'calculated_at', pg_catalog.clock_timestamp()
  ))
  into v_result
  from stats;

  return v_result;
end;
$$;

revoke all on function public.get_progress_overview(text, integer)
  from public, anon;
grant execute on function public.get_progress_overview(text, integer)
  to authenticated;
