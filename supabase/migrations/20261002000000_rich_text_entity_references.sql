-- Stable, opaque URLs and tenant-safe project search for rich-text references.
alter table public.page add column url_key uuid not null default gen_random_uuid();
alter table public.canvas_object add column url_key uuid not null default gen_random_uuid();
create unique index page_url_key_unique on public.page(url_key);
create unique index canvas_object_url_key_unique on public.canvas_object(url_key);

create function public.search_project_entities(p_project_id uuid, p_query text default '')
returns table(entity_type text, entity_id uuid, title text, context text, url_key uuid)
language sql stable security invoker set search_path='' as $$
  select 'page', p.id, p.title, p.kind, p.url_key
  from public.page p
  where p.project_id=p_project_id and p.deleted_at is null
    and public.is_workspace_member(public.workspace_for_project(p.project_id))
    and (trim(p_query)='' or p.title ilike '%'||replace(trim(p_query),'%','\%')||'%' escape '\')
  union all
  select 'object', o.id, coalesce(nullif(o.name,''),'Unnamed object'), pg.title, o.url_key
  from public.canvas_object o join public.page pg on pg.id=o.page_id
  where pg.project_id=p_project_id and pg.deleted_at is null and o.deleted_at is null
    and public.is_workspace_member(public.workspace_for_project(pg.project_id))
    and (trim(p_query)='' or coalesce(o.name,'') ilike '%'||replace(trim(p_query),'%','\%')||'%' escape '\')
  order by 3 limit 20
$$;

create function public.resolve_entity_url(p_url_key uuid)
returns table(entity_type text, entity_id uuid, title text, path text)
language sql stable security invoker set search_path='' as $$
  select 'page', pg.id, pg.title,
    '/w/'||w.slug||'/p/'||p.slug||'/page/'||pg.id
  from public.page pg join public.project p on p.id=pg.project_id join public.workspace w on w.id=p.workspace_id
  where pg.url_key=p_url_key and pg.deleted_at is null and p.deleted_at is null and w.deleted_at is null
    and public.is_workspace_member(w.id)
  union all
  select 'object', o.id, coalesce(nullif(o.name,''),'Unnamed object'),
    '/w/'||w.slug||'/p/'||p.slug||'/page/'||pg.id||'?object='||o.id
  from public.canvas_object o join public.page pg on pg.id=o.page_id
    join public.project p on p.id=pg.project_id join public.workspace w on w.id=p.workspace_id
  where o.url_key=p_url_key and o.deleted_at is null and pg.deleted_at is null and p.deleted_at is null and w.deleted_at is null
    and public.is_workspace_member(w.id)
$$;

revoke all on function public.search_project_entities(uuid,text) from public;
revoke all on function public.resolve_entity_url(uuid) from public;
grant execute on function public.search_project_entities(uuid,text) to authenticated;
grant execute on function public.resolve_entity_url(uuid) to authenticated;
