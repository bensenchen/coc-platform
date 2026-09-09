-- Canonical COC application schema. Apply this migration before later relationship migrations.
create extension if not exists pgcrypto;

create table public.workspace (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 1 and 120),
  slug text not null, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint workspace_slug_unique unique (slug)
);
create table public.workspace_member (
  workspace_id uuid not null references public.workspace(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(), primary key (workspace_id,user_id)
);
create table public.workspace_invitation (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspace(id) on delete cascade,
  email text not null check (email = lower(trim(email))), role text not null default 'editor' check (role in ('admin','editor','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  invited_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), accepted_at timestamptz
);
create unique index workspace_invitation_pending_unique on public.workspace_invitation(workspace_id,email) where status='pending';

create table public.project (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspace(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160), slug text not null,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), deleted_at timestamptz, unique(workspace_id,slug)
);
create index project_workspace_idx on public.project(workspace_id) where deleted_at is null;
create table public.project_member (
  project_id uuid not null references public.project(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')), created_at timestamptz not null default now(), primary key(project_id,user_id)
);

create table public.page (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.project(id) on delete cascade,
  kind text not null check(kind in ('context','data','data_view','interface_list','icd','sheet')),
  title text not null check(length(trim(title)) between 1 and 200), position numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'), created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index page_project_position_idx on public.page(project_id,position) where deleted_at is null;
create unique index page_one_interface_list on public.page(project_id) where kind='interface_list' and deleted_at is null;

create table public.canvas_object (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.page(id) on delete cascade,
  type text not null check(type in ('shape','connector','post_it','mini_sheet','attachment','picture')), name text,
  position_x numeric not null default 0, position_y numeric not null default 0, width numeric check(width is null or width >= 0), height numeric check(height is null or height >= 0),
  rotation numeric not null default 0, z_index integer not null default 0, is_physical boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'), created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index canvas_object_page_z_idx on public.canvas_object(page_id,z_index) where deleted_at is null;
create table public.connector_anchor (
  connector_id uuid primary key references public.canvas_object(id) on delete cascade,
  source_object_id uuid references public.canvas_object(id) on delete set null, source_anchor text check(source_anchor in ('top','right','bottom','left','top_left','top_right','bottom_left','bottom_right','center')),
  target_object_id uuid references public.canvas_object(id) on delete set null, target_anchor text check(target_anchor in ('top','right','bottom','left','top_left','top_right','bottom_left','bottom_right','center'))
);
create index connector_anchor_source_idx on public.connector_anchor(source_object_id);
create index connector_anchor_target_idx on public.connector_anchor(target_object_id);

create table public.sheet_column (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.page(id) on delete cascade,
  name text not null, position numeric not null default 0, data_type text not null default 'text' check(data_type in ('text','number','boolean','date','link')),
  is_default boolean not null default false, format jsonb not null default '{}'::jsonb
);
create index sheet_column_page_idx on public.sheet_column(page_id);
create table public.sheet_row (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.page(id) on delete cascade,
  position numeric not null default 0, canvas_object_id uuid references public.canvas_object(id) on delete set null,
  format jsonb not null default '{}'::jsonb
);
create index sheet_row_page_idx on public.sheet_row(page_id);
create table public.sheet_cell (
  row_id uuid not null references public.sheet_row(id) on delete cascade, column_id uuid not null references public.sheet_column(id) on delete cascade,
  value jsonb, format jsonb not null default '{}'::jsonb, primary key(row_id,column_id)
);
create table public.interface (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.project(id) on delete cascade,
  connector_id uuid not null unique references public.canvas_object(id) on delete cascade, display_id text not null,
  icd_page_id uuid references public.page(id) on delete set null, hidden boolean not null default false, unique(project_id,display_id)
);
create table public.attachment (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.project(id) on delete cascade,
  storage_path text not null unique, file_name text not null, mime_type text, size_bytes bigint check(size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table public.page_snapshot (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.page(id) on delete cascade,
  taken_at timestamptz not null default now(), taken_by uuid references auth.users(id) on delete set null, content jsonb not null
);
create index page_snapshot_page_taken_idx on public.page_snapshot(page_id,taken_at desc);

create function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger workspace_updated before update on public.workspace for each row execute function public.set_updated_at();
create trigger project_updated before update on public.project for each row execute function public.set_updated_at();
create trigger page_updated before update on public.page for each row execute function public.set_updated_at();
create trigger canvas_object_updated before update on public.canvas_object for each row execute function public.set_updated_at();

-- Security-definer predicates avoid recursive membership-policy evaluation.
create function public.is_workspace_member(wid uuid) returns boolean language sql stable security definer set search_path='' as
  $$ select exists(select 1 from public.workspace_member m where m.workspace_id=wid and m.user_id=auth.uid()) $$;
create function public.can_edit_workspace(wid uuid) returns boolean language sql stable security definer set search_path='' as
  $$ select exists(select 1 from public.workspace_member m where m.workspace_id=wid and m.user_id=auth.uid() and m.role in ('admin','editor')) $$;
create function public.is_workspace_admin(wid uuid) returns boolean language sql stable security definer set search_path='' as
  $$ select exists(select 1 from public.workspace_member m where m.workspace_id=wid and m.user_id=auth.uid() and m.role='admin') $$;
create function public.workspace_for_project(pid uuid) returns uuid language sql stable security definer set search_path='' as $$ select workspace_id from public.project where id=pid $$;
create function public.workspace_for_page(pgid uuid) returns uuid language sql stable security definer set search_path='' as $$ select p.workspace_id from public.page g join public.project p on p.id=g.project_id where g.id=pgid $$;

alter table public.workspace enable row level security; alter table public.workspace_member enable row level security;
alter table public.workspace_invitation enable row level security; alter table public.project enable row level security; alter table public.project_member enable row level security;
alter table public.page enable row level security; alter table public.canvas_object enable row level security; alter table public.connector_anchor enable row level security;
alter table public.sheet_column enable row level security; alter table public.sheet_row enable row level security; alter table public.sheet_cell enable row level security;
alter table public.interface enable row level security; alter table public.attachment enable row level security; alter table public.page_snapshot enable row level security;

create policy workspace_read on public.workspace for select using(public.is_workspace_member(id));
create policy workspace_update on public.workspace for update using(public.can_edit_workspace(id)) with check(public.can_edit_workspace(id));
create policy member_read on public.workspace_member for select using(public.is_workspace_member(workspace_id));
create policy member_admin on public.workspace_member for all using(public.is_workspace_admin(workspace_id)) with check(public.is_workspace_admin(workspace_id));
create policy invitation_admin on public.workspace_invitation for all using(public.is_workspace_admin(workspace_id)) with check(public.is_workspace_admin(workspace_id));
create policy project_read on public.project for select using(public.is_workspace_member(workspace_id));
create policy project_write on public.project for all using(public.can_edit_workspace(workspace_id)) with check(public.can_edit_workspace(workspace_id));
create policy project_member_read on public.project_member for select using(public.is_workspace_member(public.workspace_for_project(project_id)));
create policy project_member_admin on public.project_member for all using(public.is_workspace_admin(public.workspace_for_project(project_id))) with check(public.is_workspace_admin(public.workspace_for_project(project_id)));
create policy page_read on public.page for select using(public.is_workspace_member(public.workspace_for_project(project_id)));
create policy page_write on public.page for all using(public.can_edit_workspace(public.workspace_for_project(project_id))) with check(public.can_edit_workspace(public.workspace_for_project(project_id)));

-- Child records inherit access from their page/project; no client can select across tenancy.
create policy object_read on public.canvas_object for select using(public.is_workspace_member(public.workspace_for_page(page_id)));
create policy object_write on public.canvas_object for all using(public.can_edit_workspace(public.workspace_for_page(page_id))) with check(public.can_edit_workspace(public.workspace_for_page(page_id)));
create policy column_access on public.sheet_column for all using(public.is_workspace_member(public.workspace_for_page(page_id))) with check(public.can_edit_workspace(public.workspace_for_page(page_id)));
create policy row_access on public.sheet_row for all using(public.is_workspace_member(public.workspace_for_page(page_id))) with check(public.can_edit_workspace(public.workspace_for_page(page_id)));
create policy anchor_access on public.connector_anchor for all using(exists(select 1 from public.canvas_object o where o.id=connector_id and public.is_workspace_member(public.workspace_for_page(o.page_id)))) with check(exists(select 1 from public.canvas_object o where o.id=connector_id and public.can_edit_workspace(public.workspace_for_page(o.page_id))));
create policy cell_access on public.sheet_cell for all using(exists(select 1 from public.sheet_row r where r.id=row_id and public.is_workspace_member(public.workspace_for_page(r.page_id)))) with check(exists(select 1 from public.sheet_row r where r.id=row_id and public.can_edit_workspace(public.workspace_for_page(r.page_id))));
create policy interface_access on public.interface for all using(public.is_workspace_member(public.workspace_for_project(project_id))) with check(public.can_edit_workspace(public.workspace_for_project(project_id)));
create policy attachment_access on public.attachment for all using(public.is_workspace_member(public.workspace_for_project(project_id))) with check(public.can_edit_workspace(public.workspace_for_project(project_id)));
create policy snapshot_access on public.page_snapshot for all using(public.is_workspace_member(public.workspace_for_page(page_id))) with check(public.can_edit_workspace(public.workspace_for_page(page_id)));

create function public.create_workspace_for_user(workspace_name text) returns public.workspace language plpgsql security definer set search_path='' as $$
declare w public.workspace; base text; candidate text; n int:=1;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  base:=trim(both '-' from regexp_replace(lower(trim(workspace_name)),'[^a-z0-9]+','-','g')); if base='' then base:='workspace'; end if; candidate:=base;
  loop begin insert into public.workspace(name,slug,created_by) values(trim(workspace_name),candidate,auth.uid()) returning * into w; exit;
    exception when unique_violation then n:=n+1; candidate:=base||'-'||n; end; end loop;
  insert into public.workspace_member values(w.id,auth.uid(),'admin',now()); return w;
end $$;
create function public.accept_my_invitations() returns integer language plpgsql security definer set search_path='' as $$
declare n int;
begin
  if auth.email() is null then return 0; end if;
  insert into public.workspace_member(workspace_id,user_id,role)
    select workspace_id,auth.uid(),role from public.workspace_invitation where email=lower(auth.email()) and status='pending'
    on conflict(workspace_id,user_id) do update set role=excluded.role;
  update public.workspace_invitation set status='accepted',accepted_at=now() where email=lower(auth.email()) and status='pending'; get diagnostics n=row_count; return n;
end $$;

insert into storage.buckets(id,name,public) values('attachments','attachments',false) on conflict(id) do nothing;
create policy attachment_storage_read on storage.objects for select using(bucket_id='attachments' and public.is_workspace_member((storage.foldername(name))[1]::uuid));
create policy attachment_storage_write on storage.objects for all using(bucket_id='attachments' and public.can_edit_workspace((storage.foldername(name))[1]::uuid)) with check(bucket_id='attachments' and public.can_edit_workspace((storage.foldername(name))[1]::uuid));

do $$ begin
  alter publication supabase_realtime add table public.page,public.canvas_object,public.connector_anchor,public.sheet_column,public.sheet_row,public.sheet_cell;
exception when duplicate_object then null; end $$;
