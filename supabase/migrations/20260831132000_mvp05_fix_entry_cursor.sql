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
      'entry_date', last_item.entry_date,
      'created_at', last_item.created_at,
      'id', last_item.id
    ) from page last_item
      order by last_item.entry_date asc, last_item.created_at asc, last_item.id asc
      limit 1)
  into v_items, v_has_more, v_next_cursor
  from page;

  return private.with_response_meta(jsonb_build_object(
    'items', v_items,
    'next_cursor', v_next_cursor,
    'has_more', v_has_more
  ));
end;
$$;
