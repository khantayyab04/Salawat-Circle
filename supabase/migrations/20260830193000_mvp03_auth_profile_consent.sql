create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.profile_status as enum ('active', 'suspended');
create type private.consent_type as enum ('core_processing');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  normalized_name text not null,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1 check (revision >= 1),
  constraint profiles_display_name_length check (char_length(display_name) between 2 and 30),
  constraint profiles_display_name_visible check (display_name !~ '[[:cntrl:]]')
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  timezone text not null,
  locale text not null check (locale in ('de', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type private.consent_type not null,
  document_version text not null,
  locale text not null check (locale in ('de', 'en')),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint consent_records_one_document unique (
    user_id,
    consent_type,
    document_version
  )
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy user_settings_select_own
  on public.user_settings
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_settings from anon, authenticated;
revoke all on private.consent_records from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.user_settings to authenticated;

create or replace function private.has_core_consent(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.consent_records
    where user_id = p_user_id
      and consent_type = 'core_processing'
      and withdrawn_at is null
  );
$$;

create or replace function public.get_onboarding_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  return jsonb_build_object(
    'profile_complete', exists (
      select 1
      from public.profiles p
      join public.user_settings s on s.user_id = p.id
      where p.id = v_user_id
        and p.status = 'active'
    ),
    'consent_granted', private.has_core_consent(v_user_id)
  );
end;
$$;

create or replace function public.upsert_my_profile(
  p_display_name text,
  p_timezone text,
  p_locale text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  v_display_name := normalize(
    regexp_replace(btrim(p_display_name), '[[:space:]]+', ' ', 'g'),
    NFC
  );

  if char_length(v_display_name) not between 2 and 30
     or v_display_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'P0001', message = 'INVALID_DISPLAY_NAME';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = p_timezone
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_TIMEZONE';
  end if;

  if p_locale not in ('de', 'en') then
    raise exception using errcode = 'P0001', message = 'INVALID_LOCALE';
  end if;

  insert into public.profiles (id, display_name, normalized_name)
  values (v_user_id, v_display_name, lower(v_display_name))
  on conflict (id) do update
  set display_name = excluded.display_name,
      normalized_name = excluded.normalized_name,
      updated_at = case
        when public.profiles.display_name is distinct from excluded.display_name
          then now()
        else public.profiles.updated_at
      end,
      revision = public.profiles.revision + case
        when public.profiles.display_name is distinct from excluded.display_name
          then 1
        else 0
      end;

  insert into public.user_settings (user_id, timezone, locale)
  values (v_user_id, p_timezone, p_locale)
  on conflict (user_id) do update
  set timezone = excluded.timezone,
      locale = excluded.locale,
      updated_at = case
        when public.user_settings.timezone is distinct from excluded.timezone
          or public.user_settings.locale is distinct from excluded.locale
          then now()
        else public.user_settings.updated_at
      end;

  return public.get_onboarding_state();
end;
$$;

create or replace function public.grant_core_consent(p_locale text)
returns jsonb
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

  if p_locale not in ('de', 'en') then
    raise exception using errcode = 'P0001', message = 'INVALID_LOCALE';
  end if;

  if not exists (
    select 1 from public.profiles where id = v_user_id and status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  insert into private.consent_records (
    user_id,
    consent_type,
    document_version,
    locale
  ) values (
    v_user_id,
    'core_processing',
    'mvp-core-v1',
    p_locale
  )
  on conflict (user_id, consent_type, document_version) do nothing;

  return public.get_onboarding_state();
end;
$$;

revoke all on function private.has_core_consent(uuid) from public, anon, authenticated;
revoke all on function public.get_onboarding_state() from public, anon;
revoke all on function public.upsert_my_profile(text, text, text) from public, anon;
revoke all on function public.grant_core_consent(text) from public, anon;
grant execute on function public.get_onboarding_state() to authenticated;
grant execute on function public.upsert_my_profile(text, text, text) to authenticated;
grant execute on function public.grant_core_consent(text) to authenticated;
