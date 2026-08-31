create or replace function private.require_owned_active_group(
  p_group_id uuid,
  p_user_id uuid
)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups%rowtype;
begin
  if p_group_id is null or p_user_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select group_row.* into v_group
  from public.groups group_row
  join public.group_memberships membership
    on membership.group_id = group_row.id
  where group_row.id = p_group_id
    and group_row.status = 'active'
    and group_row.owner_user_id = p_user_id
    and membership.user_id = p_user_id
    and membership.left_at is null;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  return v_group;
end;
$$;

create or replace function private.normalize_group_invite_token(p_token text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_token text := pg_catalog.btrim(coalesce(p_token, ''));
begin
  if v_token = '' or v_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  return v_token;
end;
$$;

create or replace function private.normalize_group_invite_code(p_code text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_code text := pg_catalog.upper(
    pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_code, '')), '[[:space:]-]+', '', 'g')
  );
begin
  if v_code !~ '^[A-HJKMNPQRSTUVWXYZ2-9]{10}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  return v_code;
end;
$$;

create or replace function private.group_invite_token_hash(p_token text)
returns bytea
language sql
immutable
security definer
set search_path = ''
as $$
  select extensions.digest(private.normalize_group_invite_token(p_token), 'sha256');
$$;

create or replace function private.group_invite_code_hash(p_code text)
returns bytea
language sql
immutable
security definer
set search_path = ''
as $$
  select extensions.digest(private.normalize_group_invite_code(p_code), 'sha256');
$$;

create or replace function private.generate_group_invite_token()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  v_token := pg_catalog.translate(
    pg_catalog.encode(extensions.gen_random_bytes(32), 'base64'),
    E'+/\n\r=',
    '-_'
  );

  return private.normalize_group_invite_token(v_token);
end;
$$;

create or replace function private.generate_group_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_alphabet_size constant integer := char_length(v_alphabet);
  v_max_unbiased constant integer := (256 / v_alphabet_size) * v_alphabet_size;
  v_random bytea;
  v_code text := '';
  v_byte integer;
begin
  while char_length(v_code) < 10 loop
    v_random := extensions.gen_random_bytes(1);
    v_byte := pg_catalog.get_byte(v_random, 0);

    if v_byte < v_max_unbiased then
      v_code := v_code || pg_catalog.substr(
        v_alphabet,
        mod(v_byte, v_alphabet_size) + 1,
        1
      );
    end if;
  end loop;

  return private.normalize_group_invite_code(v_code);
end;
$$;

create or replace function public.create_group_invite(
  p_group_id uuid,
  p_expires_in_days integer default 7,
  p_max_uses integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_group public.groups%rowtype;
  v_invite private.group_invites%rowtype;
  v_token text;
  v_code text;
  v_attempt integer := 0;
begin
  v_user_id := private.require_active_core_user();

  if p_expires_in_days is null or p_expires_in_days not between 1 and 30 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if p_max_uses is null or p_max_uses not between 1 and 100 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_group := private.require_owned_active_group(p_group_id, v_user_id);

  loop
    v_token := private.generate_group_invite_token();
    v_code := private.generate_group_invite_code();

    begin
      insert into private.group_invites (
        group_id,
        created_by,
        token_hash,
        code_hash,
        expires_at,
        max_uses
      ) values (
        v_group.id,
        v_user_id,
        private.group_invite_token_hash(v_token),
        private.group_invite_code_hash(v_code),
        pg_catalog.now() + make_interval(days => p_expires_in_days),
        p_max_uses
      )
      returning * into v_invite;
      exit;
    exception
      when unique_violation then
        v_attempt := v_attempt + 1;
        if v_attempt >= 8 then
          raise exception using errcode = 'P0001', message = 'INTERNAL';
        end if;
    end;
  end loop;

  return private.with_response_meta(jsonb_build_object(
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'group_id', v_invite.group_id,
      'token', v_token,
      'code', v_code,
      'expires_at', v_invite.expires_at,
      'max_uses', v_invite.max_uses,
      'use_count', v_invite.use_count,
      'revoked_at', v_invite.revoked_at,
      'created_at', v_invite.created_at
    )
  ));
end;
$$;

create or replace function public.list_group_invites(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_group public.groups%rowtype;
  v_items jsonb;
begin
  v_user_id := private.require_active_core_user();
  v_group := private.require_owned_active_group(p_group_id, v_user_id);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', invite.id,
      'group_id', invite.group_id,
      'expires_at', invite.expires_at,
      'max_uses', invite.max_uses,
      'use_count', invite.use_count,
      'revoked_at', invite.revoked_at,
      'created_at', invite.created_at,
      'status', case
        when invite.revoked_at is not null then 'revoked'
        when invite.expires_at <= pg_catalog.clock_timestamp() then 'expired'
        when invite.use_count >= invite.max_uses then 'exhausted'
        else 'active'
      end
    )
    order by invite.created_at desc, invite.id desc
  ), '[]'::jsonb)
  into v_items
  from private.group_invites invite
  where invite.group_id = v_group.id;

  return private.with_response_meta(jsonb_build_object('items', v_items));
end;
$$;

create or replace function public.revoke_group_invite(
  p_group_id uuid,
  p_invite_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_group public.groups%rowtype;
  v_invite private.group_invites%rowtype;
  v_revoked_at timestamptz := pg_catalog.clock_timestamp();
begin
  if p_invite_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  v_user_id := private.require_active_core_user();
  v_group := private.require_owned_active_group(p_group_id, v_user_id);

  update private.group_invites invite
  set revoked_at = coalesce(invite.revoked_at, v_revoked_at)
  where invite.id = p_invite_id
    and invite.group_id = v_group.id
  returning * into v_invite;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  return private.with_response_meta(jsonb_build_object(
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'group_id', v_invite.group_id,
      'expires_at', v_invite.expires_at,
      'max_uses', v_invite.max_uses,
      'use_count', v_invite.use_count,
      'revoked_at', v_invite.revoked_at,
      'created_at', v_invite.created_at,
      'status', case
        when v_invite.revoked_at is not null then 'revoked'
        when v_invite.expires_at <= pg_catalog.clock_timestamp() then 'expired'
        when v_invite.use_count >= v_invite.max_uses then 'exhausted'
        else 'active'
      end
    )
  ));
end;
$$;

revoke all on function private.require_owned_active_group(uuid, uuid) from public, anon, authenticated;
revoke all on function private.normalize_group_invite_token(text) from public, anon, authenticated;
revoke all on function private.normalize_group_invite_code(text) from public, anon, authenticated;
revoke all on function private.group_invite_token_hash(text) from public, anon, authenticated;
revoke all on function private.group_invite_code_hash(text) from public, anon, authenticated;
revoke all on function private.generate_group_invite_token() from public, anon, authenticated;
revoke all on function private.generate_group_invite_code() from public, anon, authenticated;

revoke all on function public.create_group_invite(uuid, integer, integer) from public, anon;
revoke all on function public.list_group_invites(uuid) from public, anon;
revoke all on function public.revoke_group_invite(uuid, uuid) from public, anon;
grant execute on function public.create_group_invite(uuid, integer, integer) to authenticated;
grant execute on function public.list_group_invites(uuid) to authenticated;
grant execute on function public.revoke_group_invite(uuid, uuid) to authenticated;
