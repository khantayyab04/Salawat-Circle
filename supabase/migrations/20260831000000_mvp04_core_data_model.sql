create type public.group_status as enum ('active', 'suspended');

create table public.salawat_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount between 1 and 10000000),
  entry_date date not null,
  timezone text not null,
  recorded_at_client timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1 check (revision >= 1)
);

create table public.daily_goal_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null,
  amount integer check (amount is null or amount between 1 and 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, effective_from)
);

create table public.groups (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  timezone text not null,
  status public.group_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1 check (revision >= 1),
  constraint groups_name_length check (char_length(name) between 2 and 50),
  constraint groups_name_controls check (name !~ '[[:cntrl:]]')
);

create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  invite_id uuid,
  sharing_consent_version text not null,
  created_at timestamptz not null default now(),
  constraint memberships_left_after_joined check (
    left_at is null or left_at >= joined_at
  )
);

create table private.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  token_hash bytea not null unique,
  code_hash bytea not null unique,
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses between 1 and 100),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_expiry_window check (
    expires_at > created_at and expires_at <= created_at + interval '30 days'
  )
);

create table private.group_invite_uses (
  invite_id uuid not null references private.group_invites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid not null unique references public.group_memberships(id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);

create index salawat_entries_user_date_created_id_idx
  on public.salawat_entries (user_id, entry_date desc, created_at desc, id desc);
create index salawat_entries_user_updated_idx
  on public.salawat_entries (user_id, updated_at);
create index salawat_entries_user_date_idx
  on public.salawat_entries (user_id, entry_date);
create index groups_owner_status_idx
  on public.groups (owner_user_id, status);
create index memberships_active_group_idx
  on public.group_memberships (group_id, user_id)
  where left_at is null;
create unique index memberships_one_active_period_idx
  on public.group_memberships (group_id, user_id)
  where left_at is null;
create index group_invites_group_idx on private.group_invites (group_id);

create or replace function private.reject_recorded_at_client_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.recorded_at_client is distinct from old.recorded_at_client then
    raise exception using errcode = 'P0001', message = 'RECORDED_AT_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger salawat_entries_recorded_at_immutable
before update on public.salawat_entries
for each row execute function private.reject_recorded_at_client_changes();

alter table public.salawat_entries enable row level security;
alter table public.salawat_entries force row level security;
alter table public.daily_goal_versions enable row level security;
alter table public.daily_goal_versions force row level security;
alter table public.groups enable row level security;
alter table public.groups force row level security;
alter table public.group_memberships enable row level security;
alter table public.group_memberships force row level security;

revoke all on public.salawat_entries from public, anon, authenticated;
revoke all on public.daily_goal_versions from public, anon, authenticated;
revoke all on public.groups from public, anon, authenticated;
revoke all on public.group_memberships from public, anon, authenticated;
revoke all on private.group_invites from public, anon, authenticated;
revoke all on private.group_invite_uses from public, anon, authenticated;

grant select on public.salawat_entries to authenticated;
grant select on public.daily_goal_versions to authenticated;
grant select (
  id,
  name,
  timezone,
  status,
  created_at,
  updated_at,
  revision
) on public.groups to authenticated;
grant select on public.group_memberships to authenticated;

create policy salawat_entries_select_own
  on public.salawat_entries
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.status = 'active'
    )
  );

create policy daily_goal_versions_select_own
  on public.daily_goal_versions
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.status = 'active'
    )
  );

create policy group_memberships_select_own
  on public.group_memberships
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.status = 'active'
    )
  );

create policy groups_select_for_active_members
  on public.groups
  for select to authenticated
  using (
    groups.status = 'active'
    and exists (
      select 1
      from public.profiles profile
      where profile.id = (select auth.uid())
        and profile.status = 'active'
    )
    and exists (
      select 1
      from public.group_memberships membership
      where membership.group_id = groups.id
        and membership.user_id = (select auth.uid())
        and membership.left_at is null
    )
  );

alter table public.group_memberships
  add constraint group_memberships_invite_id_fkey
  foreign key (invite_id)
  references private.group_invites(id)
  on delete restrict;

create or replace function private.reject_group_timezone_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.timezone is distinct from old.timezone then
    raise exception using errcode = 'P0001', message = 'GROUP_TIMEZONE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger groups_timezone_immutable
before update on public.groups
for each row execute function private.reject_group_timezone_changes();

create or replace function private.validate_invite_creator_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.groups group_row
    where group_row.id = new.group_id
      and group_row.owner_user_id = new.created_by
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  return new;
end;
$$;

create trigger group_invites_creator_is_owner
before insert or update of group_id, created_by on private.group_invites
for each row execute function private.validate_invite_creator_owner();

create or replace function private.validate_group_invite_use()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_invite_group_id uuid;
  v_membership_group_id uuid;
  v_membership_user_id uuid;
begin
  select group_id into v_invite_group_id
  from private.group_invites
  where id = new.invite_id;

  select group_id, user_id into v_membership_group_id, v_membership_user_id
  from public.group_memberships
  where id = new.membership_id;

  if v_invite_group_id is null
     or v_membership_group_id is null
     or v_invite_group_id <> v_membership_group_id
     or v_membership_user_id <> new.user_id then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  return new;
end;
$$;

create trigger group_invite_uses_match_membership
before insert or update of invite_id, user_id, membership_id on private.group_invite_uses
for each row execute function private.validate_group_invite_use();

create index salawat_entries_user_recorded_at_idx
  on public.salawat_entries (user_id, recorded_at_client);

create or replace function private.is_valid_timezone(p_timezone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_timezone is not null and exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = p_timezone
  );
$$;

create or replace function private.normalise_name(p_name text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select normalize(
    pg_catalog.regexp_replace(pg_catalog.btrim(p_name), '[[:space:]]+', ' ', 'g'),
    NFC
  );
$$;

create or replace function private.require_active_core_user()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  if not private.has_core_consent(v_user_id) then
    raise exception using errcode = 'P0001', message = 'CONSENT_REQUIRED';
  end if;

  return v_user_id;
end;
$$;

create or replace function private.with_response_meta(p_payload jsonb)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
    'request_id', pg_catalog.gen_random_uuid(),
    'server_time', pg_catalog.clock_timestamp()
  );
$$;

create or replace function private.entry_payload(p_entry public.salawat_entries)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_entry.id,
    'amount', p_entry.amount::text,
    'entry_date', p_entry.entry_date,
    'timezone', p_entry.timezone,
    'recorded_at_client', p_entry.recorded_at_client,
    'created_at', p_entry.created_at,
    'updated_at', p_entry.updated_at,
    'revision', p_entry.revision
  );
$$;

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
      coalesce((
        select min(effective_from)
        from public.daily_goal_versions
        where user_id = v_user_id
      ), v_today)::timestamp,
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

create or replace function public.list_entries(
  p_cursor_entry_date date default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
  v_next_cursor jsonb;
  v_has_more boolean;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if (p_cursor_entry_date is null) <> (p_cursor_created_at is null)
     or (p_cursor_entry_date is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  with ordered as (
    select entry.*
    from public.salawat_entries entry
    where entry.user_id = v_user_id
      and (
        p_cursor_entry_date is null
        or (entry.entry_date, entry.created_at, entry.id) < (
          p_cursor_entry_date,
          p_cursor_created_at,
          p_cursor_id
        )
      )
    order by entry.entry_date desc, entry.created_at desc, entry.id desc
    limit p_limit + 1
  ), page as (
    select * from ordered
    order by entry_date desc, created_at desc, id desc
    limit p_limit
  )
  select
    coalesce(jsonb_agg(private.entry_payload(page) order by page.entry_date desc, page.created_at desc, page.id desc), '[]'::jsonb),
    (select count(*) > p_limit from ordered),
    (select jsonb_build_object(
      'entry_date', extra.entry_date,
      'created_at', extra.created_at,
      'id', extra.id
    ) from ordered extra
      order by extra.entry_date desc, extra.created_at desc, extra.id desc
      offset p_limit limit 1)
  into v_items, v_has_more, v_next_cursor
  from page;

  return private.with_response_meta(jsonb_build_object(
    'items', v_items,
    'next_cursor', v_next_cursor,
    'has_more', v_has_more
  ));
end;
$$;

create or replace function public.create_entry(
  p_id uuid,
  p_amount integer,
  p_entry_date date,
  p_timezone text,
  p_recorded_at_client timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_entry public.salawat_entries%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if p_amount is null or p_amount not between 1 and 10000000 then
    raise exception using errcode = 'P0001', message = 'INVALID_AMOUNT';
  end if;
  if not private.is_valid_timezone(p_timezone) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if p_entry_date is null or p_recorded_at_client is null then
    raise exception using errcode = 'P0001', message = 'INVALID_DATE';
  end if;

  v_today := (pg_catalog.now() at time zone p_timezone)::date;
  if p_entry_date > v_today or p_entry_date < v_today - 365 then
    raise exception using errcode = 'P0001', message = 'INVALID_DATE';
  end if;
  if p_recorded_at_client > pg_catalog.clock_timestamp() + interval '24 hours' then
    raise exception using errcode = 'P0001', message = 'INVALID_DATE';
  end if;

  select * into v_entry
  from public.salawat_entries
  where id = p_id;

  if found then
    if v_entry.user_id <> v_user_id then
      raise exception using errcode = 'P0001', message = 'NOT_FOUND';
    end if;
    if v_entry.amount = p_amount
       and v_entry.entry_date = p_entry_date
       and v_entry.timezone = p_timezone
       and v_entry.recorded_at_client = p_recorded_at_client then
      return private.with_response_meta(jsonb_build_object('entry', private.entry_payload(v_entry)));
    end if;
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  begin
    insert into public.salawat_entries (
      id, user_id, amount, entry_date, timezone, recorded_at_client
    ) values (
      p_id, v_user_id, p_amount, p_entry_date, p_timezone, p_recorded_at_client
    )
    returning * into v_entry;
  exception when unique_violation then
    select * into v_entry
    from public.salawat_entries
    where id = p_id;

    if not found or v_entry.user_id <> v_user_id then
      raise exception using errcode = 'P0001', message = 'NOT_FOUND';
    end if;
    if v_entry.amount <> p_amount
       or v_entry.entry_date <> p_entry_date
       or v_entry.timezone <> p_timezone
       or v_entry.recorded_at_client <> p_recorded_at_client then
      raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
    end if;
  end;

  return private.with_response_meta(jsonb_build_object('entry', private.entry_payload(v_entry)));
end;
$$;

create or replace function public.update_entry(
  p_id uuid,
  p_amount integer,
  p_entry_date date,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.salawat_entries%rowtype;
  v_today date;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_amount is null or p_amount not between 1 and 10000000 then
    raise exception using errcode = 'P0001', message = 'INVALID_AMOUNT';
  end if;
  if p_entry_date is null or p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select * into v_entry
  from public.salawat_entries
  where id = p_id and user_id = v_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_entry.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  v_today := (pg_catalog.now() at time zone v_entry.timezone)::date;
  if p_entry_date > v_today or p_entry_date < v_today - 365 then
    raise exception using errcode = 'P0001', message = 'INVALID_DATE';
  end if;

  update public.salawat_entries
  set amount = p_amount,
      entry_date = p_entry_date,
      updated_at = pg_catalog.clock_timestamp(),
      revision = revision + 1
  where id = p_id
    and user_id = v_user_id
    and revision = p_expected_revision
  returning * into v_entry;

  if not found then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  return private.with_response_meta(jsonb_build_object('entry', private.entry_payload(v_entry)));
end;
$$;

create or replace function public.delete_entry(
  p_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.salawat_entries%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select * into v_entry
  from public.salawat_entries
  where id = p_id and user_id = v_user_id;

  if found then
    if v_entry.revision <> p_expected_revision then
      raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
    end if;
    delete from public.salawat_entries
    where id = p_id
      and user_id = v_user_id
      and revision = p_expected_revision;
  end if;

  return private.with_response_meta(jsonb_build_object('deleted', true));
end;
$$;

create or replace function public.set_daily_goal(
  p_effective_from date,
  p_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_goal public.daily_goal_versions%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  select (pg_catalog.now() at time zone timezone)::date
    into v_today
  from public.user_settings
  where user_id = v_user_id;

  if p_effective_from is null or p_effective_from <> v_today then
    raise exception using errcode = 'P0001', message = 'INVALID_DATE';
  end if;
  if p_amount is not null and p_amount not between 1 and 10000000 then
    raise exception using errcode = 'P0001', message = 'INVALID_AMOUNT';
  end if;

  insert into public.daily_goal_versions (user_id, effective_from, amount)
  values (v_user_id, p_effective_from, p_amount)
  on conflict (user_id, effective_from) do update
  set amount = excluded.amount,
      updated_at = case
        when public.daily_goal_versions.amount is distinct from excluded.amount
          then pg_catalog.clock_timestamp()
        else public.daily_goal_versions.updated_at
      end
  returning * into v_goal;

  return private.with_response_meta(jsonb_build_object('goal', jsonb_build_object(
    'id', v_goal.id,
    'effective_from', v_goal.effective_from,
    'amount', v_goal.amount::text,
    'created_at', v_goal.created_at,
    'updated_at', v_goal.updated_at
  )));
end;
$$;

create or replace function private.group_leaderboard_rows(
  p_group_id uuid,
  p_period_start date,
  p_period_end date
)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  normalized_name text,
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
    profile.display_name,
    profile.normalized_name,
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
  group by membership.id, membership.user_id, profile.display_name, profile.normalized_name;
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

create or replace function public.create_group(
  p_client_group_id uuid,
  p_name text,
  p_timezone text
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
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_client_group_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 50 or v_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;
  if not private.is_valid_timezone(p_timezone) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  insert into public.groups (id, owner_user_id, name, normalized_name, timezone)
  values (p_client_group_id, v_user_id, v_name, pg_catalog.lower(v_name), p_timezone)
  on conflict (id) do nothing;

  select * into v_group
  from public.groups
  where id = p_client_group_id;

  if v_group.owner_user_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.normalized_name <> pg_catalog.lower(v_name)
     or v_group.timezone <> p_timezone then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  insert into public.group_memberships (
    group_id, user_id, sharing_consent_version
  ) values (
    v_group.id, v_user_id, 'mvp04-owner-v1'
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

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone,
      'status', v_group.status,
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

create or replace function public.update_group_name(
  p_group_id uuid,
  p_name text,
  p_expected_revision integer
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
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if v_name is null or char_length(v_name) not between 2 and 50 or v_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id;

  if not found or v_group.status <> 'active' or v_group.owner_user_id <> v_user_id
     or not exists (
       select 1
       from public.group_memberships membership
       where membership.group_id = p_group_id
         and membership.user_id = v_user_id
         and membership.left_at is null
     ) then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if v_group.revision <> p_expected_revision then
    raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
  end if;

  if v_group.normalized_name <> pg_catalog.lower(v_name) then
    update public.groups
    set name = v_name,
        normalized_name = pg_catalog.lower(v_name),
        updated_at = pg_catalog.clock_timestamp(),
        revision = revision + 1
    where id = p_group_id
      and revision = p_expected_revision
    returning * into v_group;

    if not found then
      raise exception using errcode = 'P0001', message = 'ENTRY_VERSION_CONFLICT';
    end if;
  end if;

  return private.with_response_meta(jsonb_build_object('group', jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'timezone', v_group.timezone,
    'status', v_group.status,
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
    from private.group_leaderboard_rows(v_group.id, v_period_start, v_period_end) leaderboard
  )
  select rank_value into v_own_rank
  from ranked
  where user_id = v_user_id;

  with ranked as (
    select leaderboard.*,
      dense_rank() over (order by leaderboard.total desc)::integer as rank_value
    from private.group_leaderboard_rows(v_group.id, v_period_start, v_period_end) leaderboard
  ), filtered as (
    select * from ranked
    where p_cursor_rank is null
      or (rank_value, normalized_name, membership_id) > (
        p_cursor_rank,
        p_cursor_normalized_name,
        p_cursor_membership_id
      )
  ), page as (
    select * from filtered
    order by rank_value, normalized_name, membership_id
    limit p_limit
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'membership_id', page.membership_id,
      'display_name', page.display_name,
      'total', page.total::text,
      'rank', page.rank_value
    ) order by page.rank_value, page.normalized_name, page.membership_id), '[]'::jsonb),
    (select count(*) > p_limit from filtered),
    (select jsonb_build_object(
      'rank', extra.rank_value,
      'normalized_name', extra.normalized_name,
      'membership_id', extra.membership_id
    ) from filtered extra
      order by extra.rank_value, extra.normalized_name, extra.membership_id
      offset p_limit limit 1)
  into v_items, v_has_more, v_next_cursor
  from page;

  return private.with_response_meta(jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'timezone', v_group.timezone
    ),
    'period', p_period,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'own_rank', v_own_rank,
    'items', v_items,
    'next_cursor', v_next_cursor,
    'has_more', v_has_more,
    'calculated_at', pg_catalog.clock_timestamp()
  ));
end;
$$;

revoke all on function private.is_valid_timezone(text) from public, anon, authenticated;
revoke all on function private.normalise_name(text) from public, anon, authenticated;
revoke all on function private.require_active_core_user() from public, anon, authenticated;
revoke all on function private.with_response_meta(jsonb) from public, anon, authenticated;
revoke all on function private.entry_payload(public.salawat_entries) from public, anon, authenticated;
revoke all on function private.group_leaderboard_rows(uuid, date, date) from public, anon, authenticated;
revoke all on function private.validate_invite_creator_owner() from public, anon, authenticated;
revoke all on function private.validate_group_invite_use() from public, anon, authenticated;

revoke all on function public.get_home_summary(text) from public, anon;
revoke all on function public.list_entries(date, timestamptz, uuid, integer) from public, anon;
revoke all on function public.create_entry(uuid, integer, date, text, timestamptz) from public, anon;
revoke all on function public.update_entry(uuid, integer, date, integer) from public, anon;
revoke all on function public.delete_entry(uuid, integer) from public, anon;
revoke all on function public.set_daily_goal(date, integer) from public, anon;
revoke all on function public.list_my_groups() from public, anon;
revoke all on function public.create_group(uuid, text, text) from public, anon;
revoke all on function public.update_group_name(uuid, text, integer) from public, anon;
revoke all on function public.get_group_leaderboard(uuid, text, integer, text, uuid, integer) from public, anon;

grant execute on function public.get_home_summary(text) to authenticated;
grant execute on function public.list_entries(date, timestamptz, uuid, integer) to authenticated;
grant execute on function public.create_entry(uuid, integer, date, text, timestamptz) to authenticated;
grant execute on function public.update_entry(uuid, integer, date, integer) to authenticated;
grant execute on function public.delete_entry(uuid, integer) to authenticated;
grant execute on function public.set_daily_goal(date, integer) to authenticated;
grant execute on function public.list_my_groups() to authenticated;
grant execute on function public.create_group(uuid, text, text) to authenticated;
grant execute on function public.update_group_name(uuid, text, integer) to authenticated;
grant execute on function public.get_group_leaderboard(uuid, text, integer, text, uuid, integer) to authenticated;
