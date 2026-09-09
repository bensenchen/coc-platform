-- A physical canvas object and a Data Page row form a one-to-one, server-owned relationship.
-- All commands below are transactional and safe to retry.
create unique index if not exists sheet_row_live_canvas_object_unique
  on public.sheet_row (canvas_object_id)
  where canvas_object_id is not null;

create or replace function public.create_physical_data_link(
  p_canvas_object_id uuid,
  p_data_page_id uuid
) returns table (canvas_object_id uuid, sheet_row_id uuid, data_page_id uuid)
language plpgsql security invoker set search_path = public as $$
declare
  v_object public.canvas_object%rowtype;
  v_data_page public.page%rowtype;
  v_row public.sheet_row%rowtype;
  v_position numeric;
begin
  select * into v_object from canvas_object
    where id = p_canvas_object_id and deleted_at is null for update;
  if not found then raise exception 'Canvas object is unavailable'; end if;
  if v_object.type <> 'shape' then raise exception 'Only shapes can be physical'; end if;

  select * into v_data_page from page
    where id = p_data_page_id and kind = 'data' and deleted_at is null for update;
  if not found then raise exception 'Data Page is unavailable'; end if;
  if (select project_id from page where id = v_object.page_id) <> v_data_page.project_id then
    raise exception 'Object and Data Page must belong to the same project';
  end if;

  select * into v_row from sheet_row
    where canvas_object_id = v_object.id for update;
  if found then
    if v_row.page_id <> p_data_page_id then
      raise exception 'Physical object is already linked to another Data Page row';
    end if;
    update canvas_object set is_physical = true where id = v_object.id;
    return query select v_object.id, v_row.id, v_row.page_id;
    return;
  end if;

  select coalesce(max(position), -1) + 1 into v_position from sheet_row where page_id = p_data_page_id;
  insert into sheet_row (page_id, position, canvas_object_id)
    values (p_data_page_id, v_position, v_object.id)
    returning * into v_row;
  update canvas_object set is_physical = true where id = v_object.id;
  return query select v_object.id, v_row.id, v_row.page_id;
end;
$$;

create or replace function public.create_data_row_with_physical_object(
  p_data_page_id uuid,
  p_context_page_id uuid default null,
  p_new_context_title text default null,
  p_object_name text default null
) returns table (canvas_object_id uuid, sheet_row_id uuid, context_page_id uuid, data_page_id uuid)
language plpgsql security invoker set search_path = public as $$
declare
  v_data_page public.page%rowtype;
  v_context_page public.page%rowtype;
  v_object public.canvas_object%rowtype;
  v_row public.sheet_row%rowtype;
  v_position numeric;
begin
  select * into v_data_page from page where id = p_data_page_id and kind = 'data' and deleted_at is null for update;
  if not found then raise exception 'Data Page is unavailable'; end if;

  if p_context_page_id is null then
    insert into page (project_id, kind, title, created_by)
      values (v_data_page.project_id, 'context', coalesce(nullif(trim(p_new_context_title), ''), 'Context Page'), auth.uid())
      returning * into v_context_page;
  else
    select * into v_context_page from page
      where id = p_context_page_id and kind = 'context' and deleted_at is null for update;
    if not found or v_context_page.project_id <> v_data_page.project_id then
      raise exception 'Context Page is unavailable or belongs to another project';
    end if;
  end if;

  insert into canvas_object (page_id, type, name, position_x, position_y, width, height, is_physical, metadata, created_by)
    values (v_context_page.id, 'shape', nullif(trim(p_object_name), ''), 80, 80, 160, 96, true,
      jsonb_build_object('shapeKind', 'rect'), auth.uid()) returning * into v_object;
  select coalesce(max(position), -1) + 1 into v_position from sheet_row where page_id = p_data_page_id;
  insert into sheet_row (page_id, position, canvas_object_id)
    values (p_data_page_id, v_position, v_object.id) returning * into v_row;
  return query select v_object.id, v_row.id, v_context_page.id, v_data_page.id;
end;
$$;

create or replace function public.delete_data_row_relationship(
  p_sheet_row_id uuid,
  p_delete_canvas_object boolean default false
) returns table (canvas_object_id uuid, data_page_id uuid, object_deleted boolean)
language plpgsql security invoker set search_path = public as $$
declare v_row public.sheet_row%rowtype;
begin
  select * into v_row from sheet_row where id = p_sheet_row_id for update;
  if not found then return; end if; -- retry-safe delete
  delete from sheet_row where id = v_row.id;
  if v_row.canvas_object_id is not null then
    if p_delete_canvas_object then
      update canvas_object set deleted_at = now() where id = v_row.canvas_object_id and deleted_at is null;
    else
      update canvas_object set is_physical = false where id = v_row.canvas_object_id and deleted_at is null;
    end if;
  end if;
  return query select v_row.canvas_object_id, v_row.page_id, p_delete_canvas_object;
end;
$$;
