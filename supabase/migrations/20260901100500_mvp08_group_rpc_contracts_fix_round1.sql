create or replace function public.create_group(
  p_client_group_id uuid,
  p_name text,
  p_timezone text,
  p_leaderboard_anonymous boolean,
  p_rules_accepted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := private.normalise_name(p_name);
  v_group public.groups%rowtype;
  v_membership public.group_memberships%rowtype;
  v_active_group_count integer;
  v_group_created boolean := false;
  v_consent_locale text := 'de';
  v_group_sharing_version constant text := 'mvp08-group-sharing-v1';
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_client_group_id is null
     or p_leaderboard_anonymous is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if p_rules_accepted is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if p_rules_accepted is not true then
    raise exception using errcode = 'P0001', message = 'CONSENT_REQUIRED';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 50 or v_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;
  if not private.is_valid_timezone(p_timezone) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  perform 1
  from public.profiles profile_row
  where profile_row.id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  select settings.locale
  into v_consent_locale
  from public.user_settings settings
  where settings.user_id = v_user_id
    and settings.locale in ('de', 'en');

  if v_consent_locale is null then
    v_consent_locale := 'de';
  end if;

  select * into v_group
  from public.groups
  where id = p_client_group_id;

  if not found then
    select count(*)::integer
    into v_active_group_count
    from public.group_memberships membership
    join public.groups group_row
      on group_row.id = membership.group_id
    where membership.user_id = v_user_id
      and membership.left_at is null
      and group_row.status = 'active';

    if v_active_group_count >= 50 then
      raise exception using errcode = 'P0001', message = 'GROUP_LIMIT_REACHED';
    end if;

    insert into public.groups (
      id,
      owner_user_id,
      name,
      normalized_name,
      timezone,
      leaderboard_anonymous
    ) values (
      p_client_group_id,
      v_user_id,
      v_name,
      pg_catalog.lower(v_name),
      p_timezone,
      p_leaderboard_anonymous
    )
    on conflict (id) do nothing
    returning * into v_group;

    if found then
      v_group_created := true;
    else
      select * into v_group
      from public.groups
      where id = p_client_group_id;

      if not found then
        raise exception using errcode = 'P0001', message = 'INTERNAL';
      end if;
    end if;
  end if;

  if v_group.owner_user_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.normalized_name <> pg_catalog.lower(v_name)
     or v_group.timezone <> p_timezone
     or v_group.leaderboard_anonymous is distinct from p_leaderboard_anonymous then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_group_created then
    perform private.enforce_rate_limit(
      v_user_id::text,
      'create_group',
      'day',
      86400,
      10,
      pg_catalog.clock_timestamp()
    );
  end if;

  insert into public.group_memberships (
    group_id,
    user_id,
    sharing_consent_version
  ) values (
    v_group.id,
    v_user_id,
    v_group_sharing_version
  )
  on conflict (group_id, user_id) where left_at is null do nothing;

  select * into v_membership
  from public.group_memberships
  where group_id = v_group.id
    and user_id = v_user_id
    and left_at is null;

  if not found then
    raise exception using errcode = 'P0001', message = 'INTERNAL';
  end if;

  insert into private.consent_records (
    user_id,
    consent_type,
    document_version,
    locale
  ) values (
    v_user_id,
    'group_sharing',
    v_group_sharing_version,
    v_consent_locale
  )
  on conflict (user_id, consent_type, document_version) do nothing;

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
    'membership', jsonb_build_object(
      'id', v_membership.id,
      'group_id', v_membership.group_id,
      'joined_at', v_membership.joined_at,
      'created_at', v_membership.created_at
    )
  ));
end;
$$;

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
      group_values.leaderboard_anonymous, group_values.alias_epoch,
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
      join public.profiles member_profile
        on member_profile.id = member_count.user_id
      where member_count.group_id = own_totals.id
        and member_count.left_at is null
        and member_profile.status = 'active'
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
    'leaderboard_anonymous', own_totals.leaderboard_anonymous,
    'revision', own_totals.revision,
    'updated_at', own_totals.updated_at,
    'calculated_at', pg_catalog.clock_timestamp()
  ) order by own_totals.name, own_totals.id), '[]'::jsonb)
  into v_items
  from own_totals;

  return private.with_response_meta(jsonb_build_object('items', v_items));
end;
$$;

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
     or p_period not in ('week', 'all_time')
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

  if p_period = 'week' then
    v_period_end := (pg_catalog.now() at time zone v_group.timezone)::date;
    v_period_start := v_period_end - (extract(isodow from v_period_end)::integer - 1);
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
