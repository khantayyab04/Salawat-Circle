create or replace function private.normalise_group_name(p_name text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_folded text;
begin
  if p_name is null then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;

  v_name := normalize(p_name, NFC);

  if exists (
    select 1
    from pg_catalog.generate_series(1, pg_catalog.char_length(v_name)) as position(index)
    where pg_catalog.ascii(pg_catalog.substr(v_name, position.index, 1))
            between 0 and 31
       or pg_catalog.ascii(pg_catalog.substr(v_name, position.index, 1))
            between 127 and 159
       or pg_catalog.ascii(pg_catalog.substr(v_name, position.index, 1))
            in (173, 8203, 8204, 8205, 8288, 65279)
       or pg_catalog.ascii(pg_catalog.substr(v_name, position.index, 1))
            in (1564, 8206, 8207)
       or pg_catalog.ascii(pg_catalog.substr(v_name, position.index, 1))
            between 8234 and 8238
       or pg_catalog.ascii(pg_catalog.substr(v_name, position.index, 1))
            between 8294 and 8303
       or pg_catalog.ascii(pg_catalog.substr(v_name, position.index, 1))
            between 65024 and 65039
       or pg_catalog.ascii(pg_catalog.substr(v_name, position.index, 1))
            between 917760 and 917999
  ) then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;

  v_name := pg_catalog.btrim(
    pg_catalog.regexp_replace(
      v_name,
      '[[:space:]]+',
      ' ',
      'g'
    )
  );

  if pg_catalog.char_length(v_name) not between 2 and 50 then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;
  if v_name !~ '[[:alnum:]]' then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;

  v_folded := pg_catalog.lower(v_name);
  if v_folded ~ '(^|[^[:alnum:]])[[:alpha:]][[:alnum:]+.-]{1,31}:(//)?[^[:space:]]'
     or v_folded ~ '(^|[^[:alnum:]])www\.[[:alnum:]]'
     or v_folded ~ '[[:alnum:]_%+.-]+@[[:alnum:]][[:alnum:].-]*'
     or v_folded ~ '(^|[^[:alnum:]_])([[:alnum:]][[:alnum:]-]*\.)+[[:alpha:]]{2,63}($|[^[:alnum:]_-])' then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;
  if v_folded ~ '(^|[^[:alnum:]])(cunt|faggot|fotze|hurensohn|nigger)($|[^[:alnum:]])' then
    raise exception using errcode = 'P0001', message = 'NAME_REJECTED';
  end if;

  return v_name;
end;
$$;

comment on function private.normalise_group_name(text) is
  'NFC-normalizes and validates group names. Exact blocked tokens: cunt, faggot, fotze, hurensohn, nigger. This deliberately narrow de/en list contains only unmistakably abusive standalone slurs or sexualized insults; general profanity and religious, theological, or political terms are excluded to reduce false positives.';

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
  v_name text;
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

  v_name := private.normalise_group_name(p_name);

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
  v_name text;
  v_group public.groups%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  perform private.require_active_core_user();

  v_name := private.normalise_group_name(p_name);

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

revoke all on function private.normalise_group_name(text) from public, anon, authenticated;
revoke all on function public.create_group(uuid, text, text, boolean, boolean) from public, anon;
revoke all on function public.update_group_name(uuid, text, integer) from public, anon;
grant execute on function public.create_group(uuid, text, text, boolean, boolean) to authenticated;
grant execute on function public.update_group_name(uuid, text, integer) to authenticated;
