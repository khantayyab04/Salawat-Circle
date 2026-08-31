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
  if p_group_id is null or p_membership_id is null or p_attempt is null or p_attempt < 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_round := floor(p_attempt::numeric / v_combo_count::numeric)::bigint;
  v_combo_index := mod(
    mod(v_seed, v_combo_count) + mod(p_attempt::bigint, v_combo_count),
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

create or replace function private.assign_membership_alias(p_membership_id uuid)
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

  select count(*)::integer into v_active_member_count
  from public.group_memberships
  where group_id = v_membership.group_id
    and left_at is null;

  v_max_attempts := greatest(32, v_active_member_count + 8);

  for v_attempt in 0..v_max_attempts loop
    select * into v_candidate
    from private.membership_alias_candidate(v_membership.group_id, v_membership.id, v_attempt);

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

create or replace function private.backfill_active_membership_aliases()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership_id uuid;
  v_assigned integer := 0;
begin
  for v_membership_id in
    select id
    from public.group_memberships
    where left_at is null
      and (alias_name is null or alias_normalized is null)
    order by joined_at, id
  loop
    perform private.assign_membership_alias(v_membership_id);
    v_assigned := v_assigned + 1;
  end loop;

  return v_assigned;
end;
$$;

create or replace function private.ensure_membership_alias_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.left_at is null and (new.alias_name is null or new.alias_normalized is null) then
    perform private.assign_membership_alias(new.id);
  end if;

  return new;
end;
$$;

create trigger group_memberships_assign_alias_after_insert
after insert on public.group_memberships
for each row execute function private.ensure_membership_alias_after_insert();

select private.backfill_active_membership_aliases();

revoke all on function private.membership_alias_candidate(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function private.assign_membership_alias(uuid) from public, anon, authenticated;
revoke all on function private.backfill_active_membership_aliases() from public, anon, authenticated;
revoke all on function private.ensure_membership_alias_after_insert() from public, anon, authenticated;
