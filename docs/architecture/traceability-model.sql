-- Traceability write-model DDL. Apply as a new PostgreSQL/Supabase migration after
-- reconciling existing application tables; it intentionally does not synchronize them.
create schema if not exists traceability;
create extension if not exists pgcrypto;

create type traceability.page_kind as enum ('context', 'data', 'interface_list', 'icd', 'org', 'management');
create type traceability.lifecycle_state as enum ('active', 'archived', 'deleted');
create type traceability.interface_role as enum ('source', 'target', 'participant');
create type traceability.interface_status as enum ('draft', 'active', 'retired');
create type traceability.inheritance_mode as enum ('none', 'live', 'snapshot');

create table traceability.workspace (
  workspace_id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null, created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  archived_at timestamptz, archived_by uuid, deleted_at timestamptz, deleted_by uuid,
  version bigint not null default 1 check (version > 0),
  check (not (archived_at is not null and deleted_at is not null))
);
create unique index workspace_live_slug_key on traceability.workspace (lower(slug)) where deleted_at is null;

create table traceability.workspace_member (
  workspace_id uuid not null references traceability.workspace on delete restrict,
  user_id uuid not null, role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(), primary key (workspace_id, user_id)
);

create table traceability.project (
  project_id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references traceability.workspace on delete restrict,
  name text not null, slug text not null, created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  archived_at timestamptz, archived_by uuid, deleted_at timestamptz, deleted_by uuid,
  version bigint not null default 1 check (version > 0),
  check (not (archived_at is not null and deleted_at is not null))
);
create unique index project_live_slug_key on traceability.project (workspace_id, lower(slug)) where deleted_at is null;

create table traceability.page (
  page_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references traceability.project on delete restrict,
  kind traceability.page_kind not null, title text not null, position numeric not null default 0,
  content jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
  order_version bigint not null default 1 check (order_version > 0),
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  archived_at timestamptz, archived_by uuid, deleted_at timestamptz, deleted_by uuid,
  version bigint not null default 1 check (version > 0),
  check (not (archived_at is not null and deleted_at is not null))
);
create unique index one_live_interface_list_per_project on traceability.page (project_id) where kind = 'interface_list' and deleted_at is null;

create table traceability.context_object (
  context_object_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references traceability.project on delete restrict,
  parent_context_object_id uuid references traceability.context_object on delete restrict,
  object_type text not null, name text not null, description text,
  attributes jsonb not null default '{}'::jsonb, external_key text,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  archived_at timestamptz, archived_by uuid, deleted_at timestamptz, deleted_by uuid,
  version bigint not null default 1 check (version > 0),
  check (parent_context_object_id is null or parent_context_object_id <> context_object_id),
  check (not (archived_at is not null and deleted_at is not null)), unique (project_id, external_key)
);

create table traceability.object_placement (
  object_placement_id uuid primary key default gen_random_uuid(),
  page_id uuid not null references traceability.page on delete restrict,
  context_object_id uuid not null references traceability.context_object on delete restrict,
  x numeric not null, y numeric not null, width numeric, height numeric, rotation numeric not null default 0,
  z_index numeric not null default 0, style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid, version bigint not null default 1 check (version > 0)
);
create unique index one_live_placement_per_page_object on traceability.object_placement (page_id, context_object_id) where deleted_at is null;

create table traceability.data_record (
  data_record_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references traceability.project on delete restrict,
  context_object_id uuid references traceability.context_object on delete restrict,
  record_type text not null, values jsonb not null default '{}'::jsonb, external_key text,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  archived_at timestamptz, archived_by uuid, deleted_at timestamptz, deleted_by uuid,
  version bigint not null default 1 check (version > 0),
  check (not (archived_at is not null and deleted_at is not null)), unique (project_id, external_key)
);
create table traceability.data_row (
  data_row_id uuid primary key default gen_random_uuid(),
  page_id uuid not null references traceability.page on delete restrict,
  data_record_id uuid not null references traceability.data_record on delete restrict,
  position numeric not null default 0, presentation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid, version bigint not null default 1 check (version > 0)
);
create unique index one_live_row_per_page_record on traceability.data_row (page_id, data_record_id) where deleted_at is null;

create table traceability.interface (
  interface_id uuid primary key default gen_random_uuid(), project_id uuid not null references traceability.project on delete restrict,
  source_context_object_id uuid references traceability.context_object on delete restrict,
  target_context_object_id uuid references traceability.context_object on delete restrict,
  display_id text not null, name text not null, description text, status traceability.interface_status not null default 'draft',
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  archived_at timestamptz, archived_by uuid, deleted_at timestamptz, deleted_by uuid,
  version bigint not null default 1 check (version > 0), check (not (archived_at is not null and deleted_at is not null))
);
create unique index interface_live_display_id_key on traceability.interface (project_id, lower(display_id)) where deleted_at is null;
create table traceability.interface_assignment (
  interface_assignment_id uuid primary key default gen_random_uuid(),
  interface_id uuid not null references traceability.interface on delete restrict,
  context_object_id uuid not null references traceability.context_object on delete restrict,
  role traceability.interface_role not null, created_at timestamptz not null default now(), created_by uuid,
  deleted_at timestamptz, deleted_by uuid, version bigint not null default 1 check (version > 0)
);
create unique index one_live_interface_role on traceability.interface_assignment (interface_id, role) where deleted_at is null and role in ('source', 'target');
create unique index one_live_interface_participant on traceability.interface_assignment (interface_id, context_object_id, role) where deleted_at is null;

create table traceability.icd_page (
  icd_page_id uuid primary key default gen_random_uuid(),
  interface_id uuid not null references traceability.interface on delete restrict,
  page_id uuid not null unique references traceability.page on delete restrict,
  is_hidden boolean not null default false, content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid, version bigint not null default 1 check (version > 0)
);
create unique index one_live_icd_per_interface on traceability.icd_page (interface_id) where deleted_at is null;
create table traceability.org_page (
  org_page_id uuid primary key default gen_random_uuid(), page_id uuid not null unique references traceability.page on delete restrict,
  root_context_object_id uuid references traceability.context_object on delete restrict,
  layout jsonb not null default '{}'::jsonb, filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid, version bigint not null default 1 check (version > 0)
);
create table traceability.management_view (
  management_view_id uuid primary key default gen_random_uuid(), page_id uuid not null unique references traceability.page on delete restrict,
  source_page_id uuid references traceability.page on delete restrict, source_kind text,
  inheritance_mode traceability.inheritance_mode not null default 'none', source_revision_id uuid,
  config jsonb not null default '{}'::jsonb, overrides jsonb not null default '{}'::jsonb,
  order_version bigint not null default 1 check (order_version > 0),
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid, version bigint not null default 1 check (version > 0),
  check ((inheritance_mode = 'none' and source_page_id is null) or (inheritance_mode <> 'none' and source_page_id is not null))
);

create table traceability.revision (
  revision_id uuid primary key default gen_random_uuid(), project_id uuid not null references traceability.project on delete restrict,
  sequence bigint not null, event_type text not null, entity_type text not null, entity_id uuid not null,
  actor_id uuid, correlation_id uuid not null, caused_by_revision_id uuid references traceability.revision on delete restrict,
  base_version bigint, result_version bigint, patch jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique (project_id, sequence)
);
alter table traceability.management_view
  add constraint management_view_source_revision_fk
  foreign key (source_revision_id) references traceability.revision on delete restrict;

create table traceability.revision_outbox (
  revision_id uuid primary key references traceability.revision on delete restrict,
  project_id uuid not null references traceability.project on delete restrict,
  available_at timestamptz not null default now(), published_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0), last_error text
);

create table traceability.rich_text_reference (
  rich_text_reference_id uuid primary key default gen_random_uuid(), project_id uuid not null references traceability.project on delete restrict,
  owner_entity_type text not null, owner_entity_id uuid not null, owner_field text not null,
  target_entity_type text, target_entity_id uuid, target_uri text, anchor jsonb not null default '{}'::jsonb, label text,
  created_at timestamptz not null default now(), created_by uuid, updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid, version bigint not null default 1 check (version > 0),
  check (num_nonnulls(target_entity_id, target_uri) = 1)
);

-- Command functions must enforce same-project ownership, active lifecycle state,
-- page/subtype kind, optimistic versions, role authorization, management-view DAG,
-- context hierarchy cycle checks, subtype consistency, revision allocation, and outbox insertion.
-- FKs intentionally RESTRICT: lifecycle propagation is explicit and auditable, never a hidden SQL cascade.
