-- MVP12: the redesigned group detail screen offers three periods (week, month
-- and all time) for the ranking, the collective insights and the group goal.
-- Previously the ranking knew week and all time, insights were hard wired to
-- the week, and goals could only be set per week or month.
--
-- Access rules are unchanged: every function still requires an active
-- membership in an active group, goals still require ownership and a matching
-- revision, and insights still return aggregates only.

-- 1. Allow an all-time goal ---------------------------------------------------

alter table public.group_goal_versions
  drop constraint group_goal_versions_period_check;

alter table public.group_goal_versions
  add constraint group_goal_versions_period_check
  check (period in ('week', 'month', 'all'));

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

  if p_period not in ('week', 'month', 'all')
     or p_amount is null
     or p_amount < 1
     or p_amount > 10000000
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

-- 2. Insights for any of the three periods ------------------------------------

drop function if exists public.get_group_insights(uuid);

create or replace function public.get_group_insights(
  p_group_id uuid,
  p_period text default 'week'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_today date;
  v_period_start date;
  v_period_end date;
  v_active_members integer;
  v_total_members integer;
  v_period_total bigint;
  v_goal integer;
  v_remaining bigint;
  v_days_remaining integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_period is null or p_period not in ('week', 'month', 'all') then
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
    and group_row.status = 'active';
  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  v_today := (pg_catalog.now() at time zone v_group.timezone)::date;

  if p_period = 'week' then
    v_period_start := v_today - (extract(isodow from v_today)::integer - 1);
    v_period_end := v_period_start + 6;
  elsif p_period = 'month' then
    v_period_start := date_trunc('month', v_today::timestamp)::date;
    v_period_end := (v_period_start + interval '1 month - 1 day')::date;
  else
    -- All time has no lower bound: how far back a member counts is already
    -- limited by when they joined.
    v_period_start := null;
    v_period_end := v_today;
  end if;

  -- An all time period has no deadline, so "per day until the end" is not a
  -- meaningful figure and the remaining days are reported as a single day.
  v_days_remaining := greatest(v_period_end - v_today + 1, 1);

  select
    count(*) filter (where profile.status = 'active')::integer,
    count(*)::integer
    into v_active_members, v_total_members
  from public.group_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.group_id = p_group_id
    and membership.left_at is null;

  select coalesce(sum(entry.amount), 0)::bigint
    into v_period_total
  from public.salawat_entries entry
  join public.group_memberships membership
    on membership.user_id = entry.user_id
   and membership.group_id = p_group_id
   and membership.left_at is null
   and entry.recorded_at_client >= membership.joined_at
  join public.profiles profile
    on profile.id = membership.user_id
   and profile.status = 'active'
  where (v_period_start is null or entry.entry_date >= v_period_start)
    and entry.entry_date <= v_today;

  select amount
    into v_goal
  from public.group_goal_versions
  where group_id = p_group_id
    and period = p_period
    and (v_period_start is null or effective_from <= v_period_start)
  order by effective_from desc
  limit 1;

  v_remaining := case
    when v_goal is null then null
    else greatest(v_goal::bigint - v_period_total, 0)
  end;

  return private.with_response_meta(jsonb_build_object(
    'group_id', p_group_id,
    'period', p_period,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'period_total', v_period_total::text,
    -- Kept for compatibility with callers that only know the week.
    'week_total', v_period_total::text,
    'active_members', v_active_members::text,
    'total_members', v_total_members::text,
    'weekly_average', case when v_active_members > 0
      then (v_period_total / v_active_members)::text
      else null
    end,
    'goal_amount', v_goal::text,
    'remaining', v_remaining::text,
    'days_remaining', v_days_remaining,
    'group_per_day', case
      when v_remaining is null then null
      else ceil(v_remaining::numeric / v_days_remaining)::bigint::text
    end,
    'per_person_remaining', case
      when v_remaining is null or v_active_members = 0 then null
      else ceil(v_remaining::numeric / v_active_members)::bigint::text
    end,
    'per_person_per_day', case
      when v_remaining is null or v_active_members = 0 then null
      else ceil(
        v_remaining::numeric / (v_active_members * v_days_remaining)
      )::bigint::text
    end,
    'calculated_at', pg_catalog.clock_timestamp()
  ));
end;
$$;

revoke all on function public.get_group_insights(uuid, text) from public, anon;
grant execute on function public.get_group_insights(uuid, text) to authenticated;

-- 3. Leaderboard for the month ------------------------------------------------

create or replace function public.get_group_leaderboard(
  p_group_id uuid,
  p_period text,
  p_cursor_rank integer default null,
  p_cursor_normalized_name text default null,
  p_cursor_membership_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_period_start date;
  v_period_end date;
  v_own_rank integer;
  v_own_alias text;
  v_items jsonb;
  v_next_cursor jsonb;
  v_has_more boolean;
  v_member_count integer;
  v_role text;
  v_is_owner boolean;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_period is null
     or p_period not in ('week', 'month', 'all_time')
     or p_limit is null
     or p_limit not between 1 and 50 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if (p_cursor_rank is null) <> (p_cursor_normalized_name is null)
     or (p_cursor_rank is null) <> (p_cursor_membership_id is null) then
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

  v_is_owner := v_group.owner_user_id = v_user_id;
  v_role := case when v_is_owner then 'owner' else 'member' end;

  select count(*)::integer
  into v_member_count
  from public.group_memberships membership
  join public.profiles profile_row
    on profile_row.id = membership.user_id
  where membership.group_id = v_group.id
    and membership.left_at is null
    and profile_row.status = 'active';

  -- An all time board leaves both bounds null, which the row helper reads as
  -- "no date filter at all".
  if p_period = 'week' then
    v_period_end := (pg_catalog.now() at time zone v_group.timezone)::date;
    v_period_start := v_period_end - (extract(isodow from v_period_end)::integer - 1);
  elsif p_period = 'month' then
    v_period_end := (pg_catalog.now() at time zone v_group.timezone)::date;
    v_period_start := date_trunc('month', v_period_end::timestamp)::date;
  end if;

  with ranked as (
    select leaderboard.*,
      dense_rank() over (order by leaderboard.total desc)::integer as rank_value
    from private.group_leaderboard_rows(
      v_group.id,
      v_period_start,
      v_period_end,
      v_user_id,
      v_group.leaderboard_anonymous
    ) leaderboard
  )
  select rank_value, alias_name into v_own_rank, v_own_alias
  from ranked
  where is_self;

  with ranked as (
    select leaderboard.*,
      dense_rank() over (order by leaderboard.total desc)::integer as rank_value
    from private.group_leaderboard_rows(
      v_group.id,
      v_period_start,
      v_period_end,
      v_user_id,
      v_group.leaderboard_anonymous
    ) leaderboard
  ), filtered as (
    select * from ranked
    where p_cursor_rank is null
      or (rank_value, sort_name, membership_id) > (
        p_cursor_rank,
        p_cursor_normalized_name,
        p_cursor_membership_id
      )
  ), paged as (
    select *
    from filtered
    order by rank_value, sort_name, membership_id
    limit p_limit + 1
  ), page as (
    select *
    from paged
    order by rank_value, sort_name, membership_id
    limit p_limit
  ), paged_stats as (
    select count(*) as row_count
    from paged
  ), page_tail as (
    select page.rank_value, page.sort_name, page.membership_id
    from page
    order by page.rank_value desc, page.sort_name desc, page.membership_id desc
    limit 1
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'row_id', page.membership_id,
      'display_name', page.display_name,
      'total', page.total::text,
      'rank', page.rank_value,
      'is_self', page.is_self
    ) order by page.rank_value, page.sort_name, page.membership_id), '[]'::jsonb),
    (select paged_stats.row_count > p_limit from paged_stats),
    case
      when (select paged_stats.row_count > p_limit from paged_stats) then (
        select jsonb_build_object(
          'rank', page_tail.rank_value,
          'sort_name', page_tail.sort_name,
          'row_id', page_tail.membership_id
        )
        from page_tail
      )
      else null
    end
  into v_items, v_has_more, v_next_cursor
  from page;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'leaderboard_anonymous', v_group.leaderboard_anonymous,
      'member_count', v_member_count::text,
      'role', v_role,
      'is_owner', v_is_owner,
      'revision', v_group.revision
    ),
    'period', p_period,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'own_rank', v_own_rank,
    'own_alias', case when v_group.leaderboard_anonymous then v_own_alias else null end,
    'items', v_items,
    'next_cursor', v_next_cursor,
    'has_more', v_has_more,
    'calculated_at', pg_catalog.clock_timestamp()
  ));
end;
$$;
revoke all on function public.get_group_leaderboard(
  uuid, text, integer, text, uuid, integer
) from public, anon;
grant execute on function public.get_group_leaderboard(
  uuid, text, integer, text, uuid, integer
) to authenticated;