-- Immutable revisions, provider-neutral entitlements, traceability and an AI-safe retrieval boundary.
create table public.subscription_entitlement (
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z][a-z0-9_.-]+$'),
  enabled boolean not null default false,
  limit_value bigint check (limit_value is null or limit_value >= 0),
  valid_until timestamptz,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, feature_key)
);

create table public.provider_connection (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  provider text not null check (provider in ('google')),
  external_account_id text not null,
  display_name text not null,
  credential_ref text not null, -- opaque Vault/secret-manager reference; never an OAuth token
  scopes text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (workspace_id, provider, external_account_id)
);

create table public.retrieval_audit_event (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  project_id uuid not null references public.project(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  purpose text not null,
  query_text text,
  result_entity_ids uuid[] not null default '{}'
);

alter table public.subscription_entitlement enable row level security;
alter table public.provider_connection enable row level security;
alter table public.retrieval_audit_event enable row level security;
create policy entitlement_read on public.subscription_entitlement for select
  using (public.is_workspace_member(workspace_id));
create policy connection_admin on public.provider_connection for select
  using (public.is_workspace_admin(workspace_id));
create policy retrieval_audit_admin on public.retrieval_audit_event for select
  using (public.is_workspace_admin(workspace_id));

-- Snapshots are append-only, even for workspace administrators. Creation is through
-- take_page_snapshot so content and actor timestamps cannot be forged by the browser.
drop policy if exists snapshot_access on public.page_snapshot;
create policy snapshot_read on public.page_snapshot for select
  using (public.is_workspace_member(public.workspace_for_page(page_id)));
revoke insert, update, delete on public.page_snapshot from authenticated;

create or replace function public.prevent_snapshot_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'Page revisions are immutable'; end $$;
create trigger page_snapshot_immutable before update or delete on public.page_snapshot
for each row execute function public.prevent_snapshot_mutation();

create or replace function public.has_feature(p_workspace_id uuid, p_feature_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_workspace_member(p_workspace_id) and coalesce((
    select e.enabled and (e.valid_until is null or e.valid_until > now())
    from public.subscription_entitlement e
    where e.workspace_id=p_workspace_id and e.feature_key=p_feature_key
  ), p_feature_key in ('revisions','excel_export'))
$$;

create or replace function public.take_page_snapshot(p_page_id uuid)
returns public.page_snapshot language plpgsql security definer set search_path = '' as $$
declare result public.page_snapshot; source_page_id uuid; p record;
begin
  select g.*, pr.workspace_id into p from public.page g join public.project pr on pr.id=g.project_id where g.id=p_page_id;
  if p.id is null or p.kind not in ('data','sheet') then raise exception 'Only Data and Mgmt pages support revisions'; end if;
  if not public.can_edit_project(p.project_id) then raise exception 'Insufficient permission'; end if;
  source_page_id := case when p.kind='sheet' then coalesce(nullif(p.metadata->>'linkedDataPageId','')::uuid,p.id) else p.id end;
  insert into public.page_snapshot(page_id,taken_by,content)
  select p_page_id, auth.uid(), jsonb_build_object(
    'schemaVersion',1, 'page',jsonb_build_object('id',p.id,'projectId',p.project_id,'kind',p.kind,'title',p.title),
    'columns',coalesce((select jsonb_agg(to_jsonb(c) order by c.position) from public.sheet_column c where c.page_id in (source_page_id,p_page_id)),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.position) from public.sheet_row r where r.page_id in (source_page_id,p_page_id)),'[]'::jsonb),
    'cells',coalesce((select jsonb_agg(to_jsonb(c)) from public.sheet_cell c join public.sheet_row r on r.id=c.row_id where r.page_id in (source_page_id,p_page_id)),'[]'::jsonb),
    'view',p.metadata
  ) returning * into result;
  return result;
end $$;
grant execute on function public.take_page_snapshot(uuid) to authenticated;

-- Canonical dependency edges. Consumers traverse IDs, never inferred labels.
create or replace view public.canonical_entity_relationship as
select p.project_id, 'page'::text source_type, p.id source_id, 'canvas_object'::text target_type, o.id target_id, 'contains'::text relationship
from public.page p join public.canvas_object o on o.page_id=p.id and o.deleted_at is null
union all
select p.project_id, 'canvas_object', a.source_object_id, 'canvas_object', a.target_object_id, 'connects_to'
from public.connector_anchor a join public.canvas_object c on c.id=a.connector_id join public.page p on p.id=c.page_id
where a.source_object_id is not null and a.target_object_id is not null
union all
select p.project_id, 'canvas_object', r.canvas_object_id, 'sheet_row', r.id, 'represented_by'
from public.sheet_row r join public.page p on p.id=r.page_id where r.canvas_object_id is not null
union all
select i.project_id, 'interface', i.id, 'page', i.icd_page_id, 'documented_by'
from public.interface i where i.icd_page_id is not null;
revoke all on public.canonical_entity_relationship from anon, authenticated;

create or replace function public.trace_entity_dependencies(p_project_id uuid, p_entity_id uuid)
returns table(direction text, entity_type text, entity_id uuid, relationship text)
language sql stable security definer set search_path='' as $$
  select 'outbound', r.target_type, r.target_id, r.relationship from public.canonical_entity_relationship r
  where r.project_id=p_project_id and r.source_id=p_entity_id and public.is_workspace_member(public.workspace_for_project(p_project_id))
  union all
  select 'inbound', r.source_type, r.source_id, r.relationship from public.canonical_entity_relationship r
  where r.project_id=p_project_id and r.target_id=p_entity_id and public.is_workspace_member(public.workspace_for_project(p_project_id))
$$;

-- Retrieval is permission-filtered in SQL. The result carries stable IDs and
-- citation locators, and every invocation writes an audit record.
create or replace function public.retrieve_project_context(p_project_id uuid, p_query text, p_purpose text, p_limit int default 20)
returns table(entity_type text, entity_id uuid, title text, content text, source_ref text, updated_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare wid uuid; ids uuid[];
begin
  select workspace_id into wid from public.project where id=p_project_id and deleted_at is null;
  if wid is null or not public.is_workspace_member(wid) then raise exception 'Not authorized'; end if;
  if length(trim(coalesce(p_purpose,''))) < 3 then raise exception 'Retrieval purpose is required'; end if;
  p_limit := least(greatest(p_limit,1),50);
  select coalesce(array_agg(x.id),'{}') into ids from (
    select p.id from public.page p where p.project_id=p_project_id and p.deleted_at is null
      and (p.title ilike '%'||coalesce(p_query,'')||'%' or p.metadata::text ilike '%'||coalesce(p_query,'')||'%')
    order by p.updated_at desc limit p_limit
  ) x;
  insert into public.retrieval_audit_event(workspace_id,project_id,actor_id,purpose,query_text,result_entity_ids)
  values(wid,p_project_id,auth.uid(),p_purpose,p_query,ids);
  return query select 'page',p.id,p.title,p.metadata::text,'coc://page/'||p.id::text,p.updated_at
    from public.page p where p.id=any(ids) order by p.updated_at desc;
end $$;
grant execute on function public.has_feature(uuid,text), public.trace_entity_dependencies(uuid,uuid), public.retrieve_project_context(uuid,text,text,int) to authenticated;
