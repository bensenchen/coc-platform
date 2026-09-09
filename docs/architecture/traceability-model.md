# Traceability domain model

## Status and scope

This is the **pre-synchronization contract** for the traceability domain. It is deliberately a write-model specification: clients must use the commands/transactions described here rather than synchronizing UI tables directly. The companion [PostgreSQL design](traceability-model.sql) establishes the stable identity, containment, uniqueness, temporal, and permission boundaries. It does not yet install background synchronization, derived projections, or destructive cascades.

The model separates a domain identity from its visual or tabular representation. A `context_object` is the stable modelled thing; a physical canvas object is an `object_placement`; a `data_record` is the stable row identity; and a `management_view` is a projection/configuration rather than a second owner of source values. This prevents copying values merely because the same thing is displayed on a Context, Data, ICD, Org, or Mgmt page.

## Terms and stable IDs

All identifiers are opaque UUID values generated on the server. A production implementation may use UUIDv7 for time-ordered inserts, but ID semantics never depend on UUID version. They are opaque, immutable, never encode a title, path, page position, display number, or external-system key, and are never reused after purge. URLs may use them; human-readable slugs, page titles, ICD display IDs, and row numbers are mutable aliases only.

| Entity | Stable ID | Identity and lifecycle |
| --- | --- | --- |
| `workspace` | `workspace_id` | Tenant/security boundary. Owns members and projects. |
| `project` | `project_id` | Traceability boundary inside one workspace. Owns pages, objects, records, interfaces, revisions, and references. |
| `page` | `page_id` | Common route/navigation identity. `kind` is one of `context`, `data`, `interface_list`, `icd`, `org`, or `management`. |
| `context_object` | `context_object_id` | Canonical model identity for a contextual thing. It is not a canvas shape. |
| `data_record` | `data_record_id` | Canonical identity for a row of project data, independent of every page/view row. |
| `interface` | `interface_id` | Canonical identity for a directed connection between two context objects. Its display ID is an alias. |
| `icd_page` | `icd_page_id` | One optional detailed ICD representation for one interface; it has a distinct ID and points to its common `page`. |
| `org_page` | `org_page_id` | One Org projection configuration for its page. |
| `management_view` | `management_view_id` | A saved management projection; it may inherit source data but never owns it. |
| `revision` | `revision_id` | Immutable, append-only event/revision record. `sequence` is monotonic within a project. |
| `rich_text_reference` | `rich_text_reference_id` | Stable, addressable link from an owned rich-text field to a target entity or external URI. |

A server generates IDs before the commit and returns them in the mutation result. Importers retain a source-system key in `external_key`/revision payload but must map it to a generated stable ID; they must not overwrite an existing stable ID. All foreign keys use IDs, never names or display IDs.

## Canonical ownership and mutable fields

A field has one writer of record. A projection may cache it only if marked derived and keyed by `revision_id`; cache data is discarded/rebuilt, not merged back.

| Owner | Canonical fields | Non-owner rule |
| --- | --- | --- |
| `workspace` | `name`, `slug`, lifecycle timestamps/state | A project cannot rename its workspace. Membership is owned by `workspace_member`. |
| `project` | `workspace_id`, `name`, `slug`, lifecycle timestamps/state | Project routing and permissions derive from this row. |
| `page` | `project_id`, `kind`, `title`, navigation `position`, `content`, `metadata`, lifecycle state | Subtype rows own only subtype configuration; no subtype changes the common page identity or kind. |
| `context_object` | `project_id`, `object_type`, `name`, `description`, `parent_context_object_id`, `attributes`, lifecycle state | `object_placement` owns geometry and visual style; a row/view does not rename or reparent the object. |
| `object_placement` | `page_id`, `context_object_id`, `x`, `y`, `width`, `height`, `rotation`, `z_index`, `style` | It is a physical representation only. Its deletion never deletes the context object. |
| `data_record` | `project_id`, `record_type`, `values`, `context_object_id`, `external_key`, lifecycle state | A `data_row` owns ordering and presentation only; cells/views must update `values` through a typed record command. |
| `data_row` | `page_id`, `data_record_id`, `position`, row-local `presentation` | It cannot own source values and is unique per `(page_id, data_record_id)`. |
| `interface` | `project_id`, `source_context_object_id`, `target_context_object_id`, `name`, `description`, `status`, `display_id`, lifecycle state | A connector placement and ICD are representations. Endpoint changes require an interface command and validation. |
| `interface_assignment` | `interface_id`, `context_object_id`, `role` | It is the authoritative endpoint/participant set; source and target columns are denormalized, validated mirrors. |
| `icd_page` | `interface_id`, `page_id`, `is_hidden`, ICD-specific `content` | Page title/navigation is owned by `page`; hiding is not deletion. |
| `org_page` | `page_id`, `root_context_object_id`, `layout`, `filters` | It is a projection; it does not own nesting. |
| `management_view` | `page_id`, `source_page_id`, `source_kind`, `inheritance_mode`, `config`, `overrides` | It owns filters/order/format/visibility only. Source records/objects own inherited values. |
| `revision` | event metadata, actor, correlation, base/result version, immutable patch/snapshot | No business entity is updated by editing a revision. |
| `rich_text_reference` | owner entity/field, target entity/URI, range/anchor, label | The owning entity owns rich text; the reference only addresses/linkifies a range. |

`created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `archived_at`, and `archived_by` are server-owned audit fields. Clients do not supply them. `version` is server incremented on every live mutation. `metadata`, `attributes`, `values`, `content`, `style`, `layout`, `config`, and `overrides` are schema-versioned JSON documents; their owning command validates the documented JSON shape before writing.

## Required propagation rules

Every command below runs in one serializable transaction, locks affected live rows in stable UUID order, increments each changed owner’s `version`, and appends one or more `revision` events with one shared `correlation_id`. Notifications/projections run from an outbox after commit; they are idempotent on `(project_id, revision.sequence)`.

| Cause | Required transactional propagation | Must not happen |
| --- | --- | --- |
| **Physical-object creation** | Creating an `object_placement` requires an active Context page and an active `context_object` in the same project. It creates only the placement. `context_object_id` is required; if a new thing is intended, create the context object and placement in the same command, with separate revisions. | Creating/moving/copying a placement must not create/copy a `data_record`, interface, ICD, or Mgmt value. |
| **Row creation** | Creating a `data_row` requires an active Data page and active `data_record` in the same project. It creates only the row. “New record” creates the `data_record` first, then its row. Each management view recalculates its derived membership after commit. | Reusing a record on a second page must not duplicate its values or stable ID. |
| **Row deletion** | Deleting a `data_row` soft-deletes/detaches that representation and emits `data_row.deleted`. If it was the last active row, the `data_record` remains active and becomes unplaced/unlisted. | Row deletion must not delete the record, linked context object, placement, interface, or rich-text targets. |
| **Object deletion** | Deleting an `object_placement` soft-deletes only the placement. Deleting a `context_object` is a separate command: it is rejected while it has live children, active interface assignments, or live references that are not explicitly retargeted/removed in the same transaction. | Never cascade a placement deletion into its model object; never silently break an interface. |
| **Interface assignment/unassignment** | Assignment creates a unique active `interface_assignment`; it requires active same-project endpoints and validates role/cardinality. Unassignment removes the assignment, recalculates the endpoint mirror, emits assignment events, and hides the ICD if a valid required endpoint set no longer exists. | An interface cannot cross projects, point at deleted objects, or be implicitly reassigned by canvas geometry. |
| **ICD creation/hiding** | Creating an ICD requires an active interface and creates a common `page(kind='icd')` plus one `icd_page`, at most once per interface. Hide/unhide changes `icd_page.is_hidden` and navigation visibility only, preserving content and ID. Interface deletion archives/hides the ICD; restore makes it eligible to unhide but does not auto-unhide. | Hiding does not delete the page, the interface, or interface content. |
| **Context nesting** | Reparenting writes only `context_object.parent_context_object_id`; it requires same project, active parent, and a cycle check. Org pages and context projections are invalidated/rebuilt from this edge. | A page/placement must not own hierarchy; no self-parent or descendant-parent cycle is allowed. |
| **Inherited Mgmt data** | A `management_view` with `inheritance_mode='live'` resolves active source records/objects at read/projection time using its source and filters. On source create/update/delete/restore, it refreshes membership/cache and records a derived revision with `caused_by_revision_id`. `snapshot` copies a named source revision and never receives later updates; `none` has no source. | Formatting, ordering, filtering, or per-view overrides must not write source values. A view may override display only, never inherited canonical data. |

The write API must expose explicit commands such as `create_context_object_with_placement`, `create_data_record_with_row`, `remove_data_row`, `assign_interface_participant`, `create_icd_page`, `hide_icd_page`, `reparent_context_object`, and `restore_*`. Direct table updates are reserved for trusted server routines.

## Lifecycle, deletion, restoration, and archive

Entities have three independently meaningful states: **active** (`deleted_at` and `archived_at` null), **archived** (`archived_at` set), and **deleted** (`deleted_at` set). Archived records are read-only and absent from ordinary navigation; they retain links and can be restored. Deleted records are soft-deleted, excluded from normal reads and projections, and remain restorable during the retention period. Purge is an asynchronous privileged job after the configured retention period and only when legal-hold/export policy permits it.

* Deleting a workspace cascades its *lifecycle state* to active projects/pages/domain records in child-first revision order; it does not hard-delete them. Restoring the workspace restores only its own availability and does not automatically restore individually deleted descendants.
* Deleting a project similarly tombstones active project-owned entities and hides ICDs/views. A project restore restores project access but requires an explicit restore per previously deleted child.
* Deleting a common page tombstones its subtype row (`icd_page`, `org_page`, or `management_view`) and page-local placements/rows. It does not delete referenced context objects, data records, or interfaces.
* Deleting a context object is blocked as stated above. Bulk delete may first reparent children to an explicit surviving parent and archive/unassign interfaces only when the caller submits and has permission for each explicit operation.
* An interface without a valid source/target is `draft` and its ICD is hidden; a deleted interface remains referencable in revision history but cannot be assigned or displayed as active.
* A restore validates that every required owner/ancestor is active. Otherwise it fails with `owner_not_active`; no partial restore occurs. Restore emits `*.restored` revisions. ID reuse, “undelete by inserting a replacement,” and restoring a purged row are prohibited.

## Cycle, integrity, and conflict rules

Context nesting is a directed forest per project. Recursive validation rejects self edges and any new parent that is the node or its descendant; database triggers provide the final guard. `rich_text_reference` is a general graph and may contain cycles, but traversal APIs use visited IDs and depth/budget limits. Interface links may form domain cycles; they are allowed and are not hierarchy edges. Page source relationships (`management_view.source_page_id`) must be same-project and may not form a management-view dependency cycle.

A mutation includes the expected `version` of each canonical owner it edits. The server uses optimistic concurrency: if any version differs, it rejects the entire transaction with `write_conflict`, returns current entity versions and changed fields/revisions, and never performs last-writer-wins on canonical values. Reorder operations use a page/view `order_version`; conflicting moves are rejected and retried against the latest order. Disjoint field edits may be server-merged only when their JSON paths are disjoint and both commands declared field-level preconditions; the resulting revision records both bases. Derived projection updates never win over direct canonical edits.

Uniqueness is scoped as follows: workspace slug globally among live workspaces; project slug within a workspace; a live `interface_list` page per project; one active ICD per interface; one subtype row per page; one active placement per `(page_id, context_object_id)` unless a future explicit multiplicity policy changes it; and one active row per `(page_id, data_record_id)`. Database uniqueness is implemented through partial unique indexes.

## Revisions, audit, and permissions

A `revision` is append-only: `sequence` is allocated per project, `event_type` describes the command, `entity_type/entity_id` identifies its subject, and actor/correlation/causation/base/result version plus a redacted patch are immutable. The audit payload records old/new lifecycle state, assignment endpoint IDs, and reference target IDs; it must not record secrets or unredacted rich-text content where policy prohibits it. Outbox messages contain `revision_id`, not mutable entity snapshots. Administrators may read audit history; editors may read project-visible history; viewers receive only permitted current projections. No role can alter or erase revisions, except a separately audited retention/purge process.

| Capability | Viewer | Editor | Workspace admin |
| --- | ---: | ---: | ---: |
| Read active project content and non-hidden ICDs | yes | yes | yes |
| Read archived/deleted content and audit history | no | project policy only | yes |
| Create/update pages, objects, records, rows, interfaces, assignments, references, Mgmt views | no | yes | yes |
| Delete/archive/restore domain content | no | editor policy; no workspace/project delete | yes |
| Create projects, manage members, delete/restore workspace or project, purge after retention | no | no | yes |
| Override conflict or bypass validation | no | no | no; validation is never bypassed |

Authorization is checked in the database/API using the target project’s workspace membership before every command and again for every referenced entity. Cross-workspace and cross-project foreign keys are rejected even when a caller can read both. Rich-text references obey the visibility of both owner and target; an inaccessible target is rendered as an unavailable reference, not leaked by title or ID.

## Implementation gate

Before synchronization work begins, implement the SQL schema/migrations, authenticated command functions, RLS policies, revision/outbox writer, JSON schemas, and tests for every propagation row above. Do not ship client-side fan-out or polling reconciliation as a substitute for these transactional rules.
