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

  if v_membership.alias_name is not null
     and v_membership.alias_normalized is not null
     and v_membership.alias_key is not null then
    return v_membership;
  end if;

  if v_membership.alias_name is not null
     and v_membership.alias_normalized is not null
     and v_membership.alias_key is null then
    for v_attempt in 0..64 loop
      begin
        update public.group_memberships
        set alias_key = extensions.gen_random_uuid()
        where id = v_membership.id
          and left_at is null
          and alias_key is null
        returning * into v_membership;

        if found then
          return v_membership;
        end if;

        select * into v_membership
        from public.group_memberships
        where id = p_membership_id;

        if v_membership.alias_key is not null then
          return v_membership;
        end if;
      exception
        when unique_violation then
          continue;
      end;
    end loop;

    select * into v_membership
    from public.group_memberships
    where id = p_membership_id;

    if v_membership.left_at is not null
       or v_membership.alias_key is not null then
      return v_membership;
    end if;

    if v_membership.alias_name is not null
       and v_membership.alias_normalized is not null then
      raise exception using errcode = 'P0001', message = 'INTERNAL';
    end if;
  end if;

  select count(*)::integer into v_active_member_count
  from public.group_memberships
  where group_id = v_membership.group_id
    and left_at is null;

  v_max_attempts := greatest(1024, v_active_member_count + 16);

  for v_attempt in 0..v_max_attempts loop
    select * into v_candidate
    from private.membership_alias_candidate(v_membership.group_id, v_membership.id, v_attempt);

    if p_disallowed_alias_normalized is not null
       and v_candidate.alias_normalized = p_disallowed_alias_normalized then
      continue;
    end if;

    begin
      update public.group_memberships
      set alias_name = v_candidate.alias_name,
          alias_normalized = v_candidate.alias_normalized,
          alias_key = coalesce(alias_key, extensions.gen_random_uuid())
      where id = v_membership.id
        and left_at is null
        and (alias_name is null or alias_normalized is null or alias_key is null)
      returning * into v_membership;

      if found then
        return v_membership;
      end if;

      select * into v_membership
      from public.group_memberships
      where id = p_membership_id;

      if v_membership.alias_name is not null
         and v_membership.alias_normalized is not null
         and v_membership.alias_key is not null then
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

create or replace function private.ensure_membership_alias_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.left_at is null
     and (new.alias_name is null or new.alias_normalized is null or new.alias_key is null) then
    perform private.assign_membership_alias(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists group_memberships_assign_alias_after_update on public.group_memberships;
create trigger group_memberships_assign_alias_after_update
after update of left_at, alias_name, alias_normalized, alias_key on public.group_memberships
for each row
when (new.left_at is null and (new.alias_name is null or new.alias_normalized is null or new.alias_key is null))
execute function private.ensure_membership_alias_after_insert();
