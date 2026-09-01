alter table public.groups
  add column leaderboard_anonymous boolean not null default false;

grant select (leaderboard_anonymous) on public.groups to authenticated;

alter table public.group_memberships
  add column alias_name text,
  add column alias_normalized text;

create unique index memberships_active_alias_normalized_unique_idx
  on public.group_memberships (group_id, alias_normalized)
  where left_at is null and alias_normalized is not null;

create table private.rate_limit_buckets (
  actor_key text not null,
  action_key text not null,
  window_key text not null,
  bucket_start timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_key, action_key, window_key, bucket_start),
  constraint rate_limit_buckets_window_key_not_blank check (char_length(window_key) > 0),
  constraint rate_limit_buckets_blocked_until_not_past_start check (
    blocked_until is null or blocked_until >= bucket_start
  )
);

create index rate_limit_buckets_actor_action_blocked_until_idx
  on private.rate_limit_buckets (actor_key, action_key, blocked_until)
  where blocked_until is not null;

alter table private.rate_limit_buckets enable row level security;
alter table private.rate_limit_buckets force row level security;

revoke all on private.rate_limit_buckets from public, anon, authenticated;

create or replace function public.list_my_groups()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  with own_groups as (
    select group_row.*, membership.id as membership_id, membership.joined_at as membership_joined_at
    from public.groups group_row
    join public.group_memberships membership
      on membership.group_id = group_row.id
    where membership.user_id = v_user_id
      and membership.left_at is null
      and group_row.status = 'active'
  ), group_values as (
    select
      own_groups.*,
      ((pg_catalog.now() at time zone own_groups.timezone)::date
        - (extract(isodow from (pg_catalog.now() at time zone own_groups.timezone)::date)::integer - 1)) as week_start,
      (pg_catalog.now() at time zone own_groups.timezone)::date as week_end
    from own_groups
  ), own_totals as (
    select group_values.*, coalesce(sum(entry.amount), 0)::bigint as own_week_total
    from group_values
    left join public.salawat_entries entry
      on entry.user_id = v_user_id
      and entry.entry_date between group_values.week_start and group_values.week_end
      and entry.recorded_at_client >= group_values.membership_joined_at
    group by group_values.id, group_values.owner_user_id, group_values.name,
      group_values.normalized_name, group_values.timezone, group_values.status,
      group_values.leaderboard_anonymous,
      group_values.created_at, group_values.updated_at, group_values.revision,
      group_values.membership_id, group_values.membership_joined_at,
      group_values.week_start, group_values.week_end
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', own_totals.id,
    'name', own_totals.name,
    'timezone', own_totals.timezone,
    'role', case when own_totals.owner_user_id = v_user_id then 'owner' else 'member' end,
    'member_count', (
      select count(*)::text
      from public.group_memberships member_count
      where member_count.group_id = own_totals.id
        and member_count.left_at is null
    ),
    'own_week_total', own_totals.own_week_total::text,
    'own_rank', 1 + (
      select count(distinct leaderboard.total)
      from private.group_leaderboard_rows(
        own_totals.id,
        own_totals.week_start,
        own_totals.week_end
      ) leaderboard
      where leaderboard.total > own_totals.own_week_total
    ),
    'calculated_at', pg_catalog.clock_timestamp()
  ) order by own_totals.name, own_totals.id), '[]'::jsonb)
  into v_items
  from own_totals;

  return private.with_response_meta(jsonb_build_object('items', v_items));
end;
$$;
