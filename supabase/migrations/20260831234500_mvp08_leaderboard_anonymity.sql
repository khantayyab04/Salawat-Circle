create or replace function private.membership_alias_candidate_for_seed(
  p_group_id uuid,
  p_membership_id uuid,
  p_rotation_seed integer,
  p_attempt integer default 0
)
returns table (
  alias_name text,
  alias_normalized text
)
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_adjectives text[] := array[
    'Ruhiger', 'Klarer', 'Sanfter', 'Stiller',
    'Heller', 'Milder', 'Wacher', 'Leiser',
    'Freier', 'Sicherer', 'Feiner', 'Weiter',
    'Tiefer', 'Fester', 'Warmer', 'Harmonischer'
  ];
  v_nouns text[] := array[
    'Garten', 'Morgen', 'Fluss', 'Pfad',
    'Stern', 'Berg', 'Wald', 'Hafen',
    'Stein', 'Wind', 'Tal', 'Zweig',
    'Ufer', 'Weg', 'Licht', 'Feld'
  ];
  v_adjective_count bigint := cardinality(v_adjectives)::bigint;
  v_noun_count bigint := cardinality(v_nouns)::bigint;
  v_combo_count bigint := v_adjective_count * v_noun_count;
  v_seed numeric := abs(pg_catalog.hashtextextended(p_group_id::text || ':' || p_membership_id::text, 0)::numeric);
  v_round bigint;
  v_combo_index bigint;
  v_adjective_index integer;
  v_noun_index integer;
begin
  if p_group_id is null
     or p_membership_id is null
     or p_rotation_seed is null
     or p_rotation_seed < 0
     or p_attempt is null
     or p_attempt < 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_round := floor(p_attempt::numeric / v_combo_count::numeric)::bigint;
  v_combo_index := mod(
    mod(v_seed, v_combo_count)
      + mod(p_rotation_seed::bigint, v_combo_count)
      + mod(p_attempt::bigint, v_combo_count),
    v_combo_count
  );

  v_adjective_index := (mod(v_combo_index, v_adjective_count) + 1)::integer;
  v_noun_index := (floor(v_combo_index::numeric / v_adjective_count::numeric)::bigint + 1)::integer;

  alias_name := v_adjectives[v_adjective_index] || ' ' || v_nouns[v_noun_index];
  if v_round > 0 then
    alias_name := alias_name || ' ' || (v_round + 1)::text;
  end if;

  alias_normalized := pg_catalog.lower(private.normalise_name(alias_name));
  return next;
end;
$$;

create or replace function private.membership_alias_candidate(
  p_group_id uuid,
  p_membership_id uuid,
  p_attempt integer default 0
)
returns table (
  alias_name text,
  alias_normalized text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rotation_seed integer;
begin
  if p_group_id is null or p_membership_id is null or p_attempt is null or p_attempt < 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select greatest(group_row.revision - 1, 0)::integer
  into v_rotation_seed
  from public.groups group_row
  where group_row.id = p_group_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  return query
  select candidate.alias_name, candidate.alias_normalized
  from private.membership_alias_candidate_for_seed(
    p_group_id,
    p_membership_id,
    v_rotation_seed,
    p_attempt
  ) candidate;
end;
$$;

create or replace function private.assign_membership_alias(
  p_membership_id uuid,
  p_disallowed_alias_normalized text
)
returns public.group_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.group_memberships%rowtype;
  v_candidate record;
  v_attempt integer;
  v_active_member_count integer;
  v_max_attempts integer;
  v_rotation_seed integer;
begin
  if p_membership_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select * into v_membership
  from public.group_memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  if v_membership.left_at is not null then
    return v_membership;
  end if;

  if v_membership.alias_name is not null and v_membership.alias_normalized is not null then
    return v_membership;
  end if;

  select greatest(group_row.revision - 1, 0)::integer
  into v_rotation_seed
  from public.groups group_row
  where group_row.id = v_membership.group_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'INTERNAL';
  end if;

  select count(*)::integer into v_active_member_count
  from public.group_memberships
  where group_id = v_membership.group_id
    and left_at is null;

  v_max_attempts := greatest(32, v_active_member_count + 8);

  for v_attempt in 0..v_max_attempts loop
    select * into v_candidate
    from private.membership_alias_candidate_for_seed(
      v_membership.group_id,
      v_membership.id,
      v_rotation_seed,
      v_attempt
    );

    if p_disallowed_alias_normalized is not null
       and v_candidate.alias_normalized = p_disallowed_alias_normalized then
      continue;
    end if;

    begin
      update public.group_memberships
      set alias_name = v_candidate.alias_name,
          alias_normalized = v_candidate.alias_normalized
      where id = v_membership.id
        and left_at is null
        and (alias_name is null or alias_normalized is null)
      returning * into v_membership;

      if found then
        return v_membership;
      end if;

      select * into v_membership
      from public.group_memberships
      where id = p_membership_id;

      if v_membership.alias_name is not null and v_membership.alias_normalized is not null then
        return v_membership;
      end if;
    exception
      when unique_violation then
        continue;
    end;
  end loop;

  raise exception using errcode = 'P0001', message = 'INTERNAL';
end;
$$;

create or replace function private.assign_membership_alias(p_membership_id uuid)
returns public.group_memberships
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.assign_membership_alias(p_membership_id, null);
end;
$$;

create or replace function private.rotate_group_membership_aliases(p_group_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership record;
  v_membership_ids uuid[] := '{}'::uuid[];
  v_previous_aliases text[] := '{}'::text[];
  v_index integer;
  v_rotated integer := 0;
begin
  if p_group_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  for v_membership in
    select membership.id, membership.alias_normalized
    from public.group_memberships membership
    where membership.group_id = p_group_id
      and membership.left_at is null
    order by membership.joined_at, membership.id
    for update
  loop
    v_membership_ids := array_append(v_membership_ids, v_membership.id);
    v_previous_aliases := array_append(v_previous_aliases, v_membership.alias_normalized);
  end loop;

  update public.group_memberships
  set alias_name = null,
      alias_normalized = null
  where group_id = p_group_id
    and left_at is null;

  if coalesce(array_length(v_membership_ids, 1), 0) = 0 then
    return 0;
  end if;

  for v_index in array_lower(v_membership_ids, 1)..array_upper(v_membership_ids, 1) loop
    perform private.assign_membership_alias(
      v_membership_ids[v_index],
      v_previous_aliases[v_index]
    );
    v_rotated := v_rotated + 1;
  end loop;

  return v_rotated;
end;
$$;

create or replace function private.group_leaderboard_rows(
  p_group_id uuid,
  p_period_start date,
  p_period_end date,
  p_viewer_user_id uuid,
  p_leaderboard_anonymous boolean
)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  sort_name text,
  alias_name text,
  is_self boolean,
  total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.id,
    membership.user_id,
    case
      when p_leaderboard_anonymous and membership.user_id <> p_viewer_user_id
        then coalesce(membership.alias_name, 'Mitglied')
      else profile.display_name
    end,
    case
      when p_leaderboard_anonymous
        then coalesce(membership.alias_normalized, membership.id::text)
      else profile.normalized_name
    end,
    coalesce(membership.alias_name, 'Mitglied'),
    membership.user_id = p_viewer_user_id,
    coalesce(sum(entry.amount) filter (
      where entry.recorded_at_client >= membership.joined_at
        and (
          p_period_start is null
          or entry.entry_date between p_period_start and p_period_end
        )
    ), 0)::bigint
  from public.group_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  left join public.salawat_entries entry on entry.user_id = membership.user_id
  where membership.group_id = p_group_id
    and membership.left_at is null
    and profile.status = 'active'
  group by
    membership.id,
    membership.user_id,
    profile.display_name,
    profile.normalized_name,
    membership.alias_name,
    membership.alias_normalized;
$$;

create or replace function public.set_group_leaderboard_anonymity(
  p_group_id uuid,
  p_anonymous boolean,
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
  v_previous_anonymous boolean;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_group_id is null
     or p_anonymous is null
     or p_expected_revision is null
     or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.* into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and group_row.owner_user_id = v_user_id
    and membership.user_id = v_user_id
    and membership.left_at is null
  for update of group_row;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  v_previous_anonymous := v_group.leaderboard_anonymous;

  if v_previous_anonymous is distinct from p_anonymous then
    update public.groups
    set leaderboard_anonymous = p_anonymous,
        updated_at = pg_catalog.clock_timestamp(),
        revision = revision + 1
    where id = p_group_id
      and revision = p_expected_revision
    returning * into v_group;

    if not found then
      raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
    end if;

    if not v_previous_anonymous and p_anonymous then
      perform private.rotate_group_membership_aliases(v_group.id);
    end if;
  end if;

  return private.with_response_meta(jsonb_build_object('group', jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'timezone', v_group.timezone,
    'status', v_group.status,
    'leaderboard_anonymous', v_group.leaderboard_anonymous,
    'created_at', v_group.created_at,
    'updated_at', v_group.updated_at,
    'revision', v_group.revision
  )));
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
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_period not in ('week', 'all_time') or p_limit is null or p_limit not between 1 and 50 then
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
      'membership_id', page.membership_id,
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
          'membership_id', page_tail.membership_id
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
      'leaderboard_anonymous', v_group.leaderboard_anonymous
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

revoke all on function private.membership_alias_candidate_for_seed(uuid, uuid, integer, integer) from public, anon, authenticated;
revoke all on function private.assign_membership_alias(uuid, text) from public, anon, authenticated;
revoke all on function private.rotate_group_membership_aliases(uuid) from public, anon, authenticated;
revoke all on function private.group_leaderboard_rows(uuid, date, date, uuid, boolean) from public, anon, authenticated;

revoke all on function public.set_group_leaderboard_anonymity(uuid, boolean, integer) from public, anon;
grant execute on function public.set_group_leaderboard_anonymity(uuid, boolean, integer) to authenticated;
