create or replace function public.get_entry(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_entry public.salawat_entries%rowtype;
begin
  v_user_id := private.require_active_core_user();

  select * into v_entry
  from public.salawat_entries
  where id = p_id
    and user_id = v_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;

  return private.with_response_meta(
    jsonb_build_object('entry', private.entry_payload(v_entry))
  );
end;
$$;

revoke all on function public.get_entry(uuid) from public, anon;
grant execute on function public.get_entry(uuid) to authenticated;
