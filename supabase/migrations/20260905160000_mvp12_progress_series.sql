-- MVP12: bucketed progress series for the redesigned Progress screen.
--
-- The screen offers four ranges (week, month, year, all time) and draws a bar
-- chart for each. Aggregating in the database keeps the payload small and
-- bounded: the all time range returns one bucket per year rather than one row
-- per day, which would grow without limit.
--
-- The function is strictly personal: it only ever reads the caller's own
-- entries and goals.

create or replace function public.get_progress_series(
  p_timezone text,
  p_range text default 'week'
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
  v_end date;
  v_first_entry date;
  v_bucket text;
  v_label_format text;
  v_buckets jsonb;
  v_total bigint;
  v_active_days integer;
  v_goal_days integer;
  v_achieved_goal_days integer;
  v_current_streak integer;
  v_longest_streak integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if not private.is_valid_timezone(p_timezone)
     or p_range is null
     or p_range not in ('week', 'month', 'year', 'all') then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_today := (pg_catalog.now() at time zone p_timezone)::date;

  select min(entry.entry_date)
    into v_first_entry
  from public.salawat_entries entry
  where entry.user_id = v_user_id;

  -- Range bounds and the granularity each range is charted at.
  --
  -- The chart always spans the whole period, so the number of bars does not
  -- change as the week or month progresses. Buckets that lie ahead of today
  -- are returned as empty and flagged, so the screen can draw them faintly
  -- instead of presenting them as missed.
  if p_range = 'week' then
    -- ISO week, Monday through Sunday, matching the rest of the product.
    v_start := v_today - (extract(isodow from v_today)::integer - 1);
    v_end := v_start + 6;
    v_bucket := 'day';
    v_label_format := 'DY';
  elsif p_range = 'month' then
    v_start := pg_catalog.date_trunc('month', v_today::timestamp)::date;
    v_end := (v_start + interval '1 month - 1 day')::date;
    v_bucket := 'week';
    v_label_format := '"W"W';
  elsif p_range = 'year' then
    v_start := pg_catalog.date_trunc('year', v_today::timestamp)::date;
    v_end := (v_start + interval '1 year - 1 day')::date;
    v_bucket := 'month';
    v_label_format := 'MON';
  else
    v_start := pg_catalog.date_trunc(
      'year',
      least(coalesce(v_first_entry, v_today), v_today)::timestamp
    )::date;
    v_end := v_today;
    v_bucket := 'year';
    v_label_format := 'YYYY';
  end if;

  -- One row per day in range, with the goal that applied on that day.
  with days as (
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
      v_end::timestamp,
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
  ),
  elapsed as (
    select * from days where days.entry_date <= v_today
  ),
  bucketed as (
    select
      pg_catalog.date_trunc(v_bucket, days.entry_date::timestamp)::date as bucket_start,
      sum(days.total) filter (where days.entry_date <= v_today)::bigint as bucket_total,
      count(*) filter (
        where days.entry_date <= v_today
          and days.goal is not null
          and days.total >= days.goal
      )::integer as bucket_achieved,
      count(*) filter (
        where days.entry_date <= v_today and days.goal is not null
      )::integer as bucket_goal_days,
      bool_and(days.entry_date > v_today) as bucket_is_future
    from days
    group by 1
  ),
  ordered_days as (
    select
      elapsed.entry_date,
      elapsed.total,
      -- Rank consecutive active days so islands of activity can be measured.
      elapsed.entry_date
        - (row_number() over (order by elapsed.entry_date))::integer as streak_group
    from elapsed
    where elapsed.total > 0
  ),
  streaks as (
    select
      count(*)::integer as length,
      max(ordered_days.entry_date) as last_day
    from ordered_days
    group by ordered_days.streak_group
  )
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'start', bucketed.bucket_start,
            'label', trim(
              to_char(bucketed.bucket_start, v_label_format)
            ),
            'total', coalesce(bucketed.bucket_total, 0)::text,
            'future', bucketed.bucket_is_future,
            'goal_reached', case
              when bucketed.bucket_is_future then null
              when bucketed.bucket_goal_days = 0 then null
              else bucketed.bucket_achieved = bucketed.bucket_goal_days
            end
          )
          order by bucketed.bucket_start
        )
        from bucketed
      ),
      '[]'::jsonb
    ),
    (select coalesce(sum(elapsed.total), 0)::bigint from elapsed),
    (select count(*) filter (where elapsed.total > 0)::integer from elapsed),
    (select count(*) filter (where elapsed.goal is not null)::integer from elapsed),
    (select count(*) filter (
       where elapsed.goal is not null and elapsed.total >= elapsed.goal
     )::integer from elapsed),
    coalesce((
      select streaks.length
      from streaks
      where streaks.last_day >= v_today - 1
      order by streaks.last_day desc
      limit 1
    ), 0),
    coalesce((select max(streaks.length) from streaks), 0)
  into
    v_buckets,
    v_total,
    v_active_days,
    v_goal_days,
    v_achieved_goal_days,
    v_current_streak,
    v_longest_streak;

  return private.with_response_meta(jsonb_build_object(
    'range', p_range,
    'period_start', v_start,
    'period_end', v_end,
    'today', v_today,
    'total', v_total::text,
    'active_days', v_active_days::text,
    'goal_days', v_goal_days::text,
    'achieved_goal_days', v_achieved_goal_days::text,
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'buckets', v_buckets
  ));
end;
$$;

revoke all on function public.get_progress_series(text, text) from public, anon;
grant execute on function public.get_progress_series(text, text) to authenticated;
