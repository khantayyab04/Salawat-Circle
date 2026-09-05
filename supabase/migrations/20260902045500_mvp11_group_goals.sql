create table public.group_goal_versions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  period text not null check (period in ('week', 'month')),
  effective_from date not null,
  amount integer check (amount is null or amount between 1 and 10000000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  unique (group_id, period, effective_from)
);

create index group_goal_versions_group_period_effective_idx
  on public.group_goal_versions (group_id, period, effective_from desc);

alter table public.group_goal_versions enable row level security;
alter table public.group_goal_versions force row level security;
revoke all on table public.group_goal_versions from public, anon, authenticated;

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
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  if p_period not in ('week', 'month')
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

  if p_period = 'week' then
    v_effective_from := (pg_catalog.now() at time zone v_group.timezone)::date
      - (extract(isodow from (pg_catalog.now() at time zone v_group.timezone)::date)::integer - 1);
  else
    v_effective_from := date_trunc(
      'month',
      pg_catalog.now() at time zone v_group.timezone
    )::date;
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
    'revision', v_group.revision
  ));
end;
$$;

revoke all on function public.set_group_goal(uuid, text, integer, integer)
  from public, anon;
grant execute on function public.set_group_goal(uuid, text, integer, integer)
  to authenticated;
