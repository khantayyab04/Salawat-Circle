-- A group has one selected monthly campaign. Dates are inclusive civil dates
-- in the immutable group timezone. Islamic months use the arithmetic civil
-- calendar, epoch 622-07-19 Gregorian; this is not a moon-sighting calendar.
create table public.group_goal_campaigns (
  group_id uuid primary key references public.groups(id) on delete cascade,
  mode text not null check (mode in ('gregorian', 'islamic', 'custom')),
  start_date date not null,
  end_date date not null,
  check (end_date >= start_date and end_date - start_date <= 30)
);
alter table public.group_goal_campaigns enable row level security;
alter table public.group_goal_campaigns force row level security;
revoke all on public.group_goal_campaigns from public, anon, authenticated;

create function private.group_campaign_bounds(p_mode text, p_date date)
returns table(start_date date, end_date date)
language plpgsql immutable set search_path = '' as $$
declare
  y integer; m integer; n integer; year_start date; month_start date; next_start date;
begin
  if p_date is null or p_date < date '1900-01-01' or p_date > date '2200-12-31'
    or p_mode is null or p_mode not in ('gregorian','islamic','custom') then
    raise exception using errcode='P0001', message='INVALID_INPUT';
  end if;
  if p_mode='custom' then
    return query select p_date, p_date+29;
  elsif p_mode='gregorian' then
    return query select date_trunc('month',p_date::timestamp)::date,
      (date_trunc('month',p_date::timestamp)+interval '1 month - 1 day')::date;
  else
    -- Tabular 30-year cycle: leap years 2,5,7,10,13,16,18,21,24,26,29.
    y := floor((30::numeric*(p_date-date '0622-07-19')+10646)/10631)::integer;
    year_start := date '0622-07-19' + 354*(y-1) + floor((3+11*y)::numeric/30)::integer;
    for m in 1..12 loop
      month_start := year_start + ceil(29.5*(m-1))::integer;
      next_start := case when m=12 then
        date '0622-07-19' + 354*y + floor((3+11*(y+1))::numeric/30)::integer
        else year_start + ceil(29.5*m)::integer end;
      if p_date >= month_start and p_date < next_start then
        return query select month_start, next_start-1;
        return;
      end if;
    end loop;
    raise exception using errcode='P0001', message='INVALID_INPUT';
  end if;
end;
$$;
revoke all on function private.group_campaign_bounds(text,date) from public,anon,authenticated;

create function private.group_campaign_week_window(p_group_id uuid, p_start date, p_end date)
returns table(start_date date,end_date date)
language sql stable set search_path='' as $$
  select case when campaign.group_id is null then p_start else greatest(p_start,campaign.start_date) end,
    case when campaign.group_id is null then p_end else least(p_end,campaign.end_date) end
  from (select 1) seed
  left join public.group_goal_campaigns campaign on campaign.group_id=p_group_id
    and campaign.start_date<=p_end and campaign.end_date>=p_start
    and (select amount from public.group_goal_versions where group_id=p_group_id and period='week'
      and effective_from<=p_start order by effective_from desc limit 1) is null
    and (select amount from public.group_goal_versions where group_id=p_group_id and period='month'
      and effective_from=campaign.start_date) is not null;
$$;
revoke all on function private.group_campaign_week_window(uuid,date,date) from public,anon,authenticated;

drop function public.set_group_goal(uuid,text,integer,integer);

create or replace function public.set_group_goal(
  p_group_id uuid,
  p_period text,
  p_amount integer,
  p_expected_revision integer,
  p_campaign_mode text default null,
  p_start_date date default null
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
  v_campaign_start date;
  v_campaign_end date;
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

  if (p_campaign_mode is null) <> (p_start_date is null)
    or (p_campaign_mode is not null and p_period <> 'month') then
    raise exception using errcode='P0001', message='INVALID_INPUT';
  end if;

  v_today := (pg_catalog.now() at time zone v_group.timezone)::date;

  if p_period = 'week' then
    v_effective_from := v_today - (extract(isodow from v_today)::integer - 1);
  elsif p_period = 'month' then
    select start_date,end_date into v_campaign_start,v_campaign_end
      from private.group_campaign_bounds(coalesce(p_campaign_mode,'gregorian'),coalesce(p_start_date,v_today));
    v_effective_from := v_campaign_start;
    insert into public.group_goal_campaigns(group_id,mode,start_date,end_date)
      values(p_group_id,coalesce(p_campaign_mode,'gregorian'),v_campaign_start,v_campaign_end)
      on conflict(group_id) do update set mode=excluded.mode,start_date=excluded.start_date,end_date=excluded.end_date;
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

revoke all on function public.set_group_goal(uuid, text, integer, integer, text, date)
  from public, anon;
grant execute on function public.set_group_goal(uuid, text, integer, integer, text, date)
  to authenticated;


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
  v_campaign public.group_goal_campaigns%rowtype;
  v_month_goal integer;
  v_goal_source text;
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

  select * into v_campaign from public.group_goal_campaigns where group_id=p_group_id;

  v_today := (pg_catalog.now() at time zone v_group.timezone)::date;

  if p_period = 'week' then
    v_period_start := v_today - (extract(isodow from v_today)::integer - 1);
    v_period_end := v_period_start + 6;
    select start_date,end_date into v_period_start,v_period_end
      from private.group_campaign_week_window(p_group_id,v_period_start,v_period_end);
  elsif p_period = 'month' then
    v_period_start := coalesce(v_campaign.start_date,date_trunc('month', v_today::timestamp)::date);
    v_period_end := coalesce(v_campaign.end_date,(v_period_start + interval '1 month - 1 day')::date);
  else
    -- All time has no lower bound: how far back a member counts is already
    -- limited by when they joined.
    v_period_start := null;
    v_period_end := v_today;
  end if;

  -- An all time period has no deadline, so "per day until the end" is not a
  -- meaningful figure and the remaining days are reported as a single day.
  v_days_remaining := greatest(v_period_end - greatest(v_today,v_period_start) + 1, 1);

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
    and entry.entry_date <= least(v_today,v_period_end);

  select amount
    into v_goal
  from public.group_goal_versions
  where group_id = p_group_id
    and period = p_period
    and (v_period_start is null or effective_from <= v_period_start)
  order by effective_from desc
  limit 1;

  v_goal_source := case when v_goal is null then null else 'explicit' end;
  if p_period='week' and v_goal is null and v_campaign.group_id is not null then
    select amount into v_month_goal from public.group_goal_versions
      where group_id=p_group_id and period='month' and effective_from=v_campaign.start_date;
    if v_month_goal is not null and v_period_start <= v_campaign.end_date and v_period_end >= v_campaign.start_date then
      v_goal := ceil(v_month_goal::numeric *
        (least(v_period_end,v_campaign.end_date)-greatest(v_period_start,v_campaign.start_date)+1)
        / (v_campaign.end_date-v_campaign.start_date+1))::integer;
      v_goal_source := 'campaign';
    end if;
  end if;

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
    'goal_source', v_goal_source,
    'campaign_mode', v_campaign.mode,
    'campaign_start', v_campaign.start_date,
    'campaign_end', v_campaign.end_date,
    'remaining', v_remaining::text,
    'days_remaining', v_days_remaining,
    'group_per_day', case
      when v_remaining is null or (p_period='month' and v_today>v_period_end) then null
      else ceil(v_remaining::numeric / v_days_remaining)::bigint::text
    end,
    'per_person_remaining', case
      when v_remaining is null or v_active_members = 0 or (p_period='month' and v_today>v_period_end) then null
      else ceil(v_remaining::numeric / v_active_members)::bigint::text
    end,
    'per_person_per_day', case
      when v_remaining is null or v_active_members = 0 or (p_period='month' and v_today>v_period_end) then null
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
    select start_date,least(v_period_end,end_date) into v_period_start,v_period_end
      from private.group_campaign_week_window(p_group_id,v_period_start,v_period_start+6);
  elsif p_period = 'month' then
    v_period_end := (pg_catalog.now() at time zone v_group.timezone)::date;
    select campaign.start_date, least(v_period_end,campaign.end_date)
      into v_period_start,v_period_end
      from public.group_goal_campaigns campaign where campaign.group_id=p_group_id;
    if not found then
      v_period_end := (pg_catalog.now() at time zone v_group.timezone)::date;
      v_period_start := date_trunc('month',v_period_end::timestamp)::date;
    end if;
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