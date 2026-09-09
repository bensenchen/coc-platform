-- Realtime synchronization, optimistic concurrency, and an immutable domain audit trail.
alter table public.sheet_column add column if not exists updated_at timestamptz not null default now();
alter table public.sheet_column add column if not exists version bigint not null default 1;
alter table public.sheet_row add column if not exists updated_at timestamptz not null default now();
alter table public.sheet_row add column if not exists version bigint not null default 1;
alter table public.sheet_cell add column if not exists updated_at timestamptz not null default now();
alter table public.sheet_cell add column if not exists version bigint not null default 1;
alter table public.connector_anchor add column if not exists updated_at timestamptz not null default now();
alter table public.connector_anchor add column if not exists version bigint not null default 1;
alter table public.interface add column if not exists updated_at timestamptz not null default now();
alter table public.interface add column if not exists version bigint not null default 1;

create table if not exists public.domain_audit_event (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  before_state jsonb,
  after_state jsonb,
  workspace_id uuid,
  project_id uuid,
  page_id uuid
);
alter table public.domain_audit_event enable row level security;
create policy "workspace members read audit events" on public.domain_audit_event for select using (
  actor_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

create or replace function public.touch_version() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end $$;

create or replace function public.record_domain_audit_event() returns trigger language plpgsql security definer set search_path = public as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  wid uuid := nullif(r->>'workspace_id','')::uuid;
  pid uuid := nullif(r->>'project_id','')::uuid;
  pgid uuid := nullif(r->>'page_id','')::uuid;
begin
  if tg_table_name = 'project' then pid := (r->>'id')::uuid; end if;
  if tg_table_name = 'page' then pgid := (r->>'id')::uuid; end if;
  if pgid is null and tg_table_name = 'connector_anchor' then
    select page_id into pgid from public.canvas_object where id = (r->>'connector_id')::uuid;
  elsif pgid is null and tg_table_name = 'sheet_cell' then
    select page_id into pgid from public.sheet_row where id = (r->>'row_id')::uuid;
  end if;
  if pid is null and pgid is not null then select project_id into pid from public.page where id = pgid; end if;
  if wid is null and pid is not null then select workspace_id into wid from public.project where id = pid; end if;
  insert into public.domain_audit_event(actor_id, entity_type, entity_id, action, before_state, after_state, workspace_id, project_id, page_id)
  values (auth.uid(), tg_table_name, coalesce(r->>'id', r->>'connector_id', concat_ws(':', r->>'row_id', r->>'column_id')),
    lower(tg_op), case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end,
    wid, pid, pgid);
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

-- Traceability-sensitive domain tables. The audit trigger cannot be bypassed by clients.
do $$ declare t text; begin
  foreach t in array array['project','page','canvas_object','connector_anchor','sheet_column','sheet_row','sheet_cell','interface'] loop
    execute format('drop trigger if exists audit_domain_change on public.%I', t);
    execute format('create trigger audit_domain_change after insert or update or delete on public.%I for each row execute function public.record_domain_audit_event()', t);
  end loop;
  foreach t in array array['connector_anchor','sheet_column','sheet_row','sheet_cell','interface'] loop
    execute format('drop trigger if exists set_version on public.%I', t);
    execute format('create trigger set_version before update on public.%I for each row execute function public.touch_version()', t);
  end loop;
end $$;

-- Idempotently add every synchronized table to Supabase Realtime.
do $$ declare t text; begin
  foreach t in array array['project','page','canvas_object','connector_anchor','sheet_column','sheet_row','sheet_cell','interface','page_snapshot'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
