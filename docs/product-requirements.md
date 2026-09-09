# COC Platform product requirements

## Product intent

COC Platform is a collaborative systems-engineering workspace. Authenticated teams use one project home to model context, structure data, define interfaces, and manage work. The product must make the work modes visibly connected while giving each page type an appropriate editor.

This document is the delivery baseline for the supplied product brief. The companion [acceptance criteria](acceptance-criteria.md) is the testable execution checklist.

## Users and permissions

| Role | Product intent |
| --- | --- |
| Visitor | May reach public authentication routes only. Protected routes redirect to Login and preserve the intended destination. |
| Member | May view workspaces and projects to which they belong. |
| Editor | A member who can create, rename, delete, and edit project pages and content. |
| Workspace administrator | An editor who can create projects and manage membership, invitations, and workspace settings. |

The product must not reveal project content to a visitor or a user outside the selected workspace. Destructive page actions require confirmation and a visibly destructive target.

## Information architecture

| Area | Canonical route | Purpose |
| --- | --- | --- |
| Login | /login | Password, magic-link, and Google entry points. |
| Home | /home | Select/create a workspace, then select/create a project. |
| Org | /admin | Workspace membership and administrative settings. |
| Project shell | /w/:workspaceSlug/p/:projectSlug | Project navigation and no-page-selected state. |
| Project page | /w/:workspaceSlug/p/:projectSlug/page/:pageId | Renderer selected by page type. |

The sidebar organizes pages into **Context**, **Data**, **Interface**, and **Mgmt**. The single Interface List is the project interface inventory; ICD pages are detailed interface-control documents. An unavailable workspace returns the member to Home instead of showing stale project content.

## Functional requirements

### Authentication and Home

1. Login supports email/password, magic link, and Google. Successful password login returns to the saved protected route or Home. Validation and provider failures remain in context.
2. Home accepts pending invitations, shows workspaces, makes selection explicit, and supports workspace creation. A selected workspace enables project creation.
3. Project cards open the project shell. Home deliberately supports no-workspace and no-project states.

### Project shell and pages

1. The shell contains Home navigation, workspace/project switchers, resizable project navigation, and account/sign-out controls.
2. Navigation groups pages by type; groups collapse; page rows open, rename, or delete. Editors can create Context, Data, Interface List, and Mgmt pages. A project has one Interface List at most.
3. Context pages provide a spatial canvas: select/pan; supported shapes and connectors; zoom; select, resize, rename, configure, and delete objects. The properties panel reserves its space when empty.
4. Data pages provide a structured table: add, rename, reorder, and delete columns; add, reorder, and delete rows; edit cells.
5. Mgmt pages provide a standalone or Data-linked sheet. Editors manage own rows/columns, ordering and colours; select ranges; copy/paste; and format a view without changing linked source data merely by formatting.
6. Interface List and ICD are first-class routes/page types. Until their complete renderers ship, they show intentional labelled placeholders, never a blank/broken page.

## Visual and accessibility direction

Use the reference package in [reference/](reference/): the approved mark [coc-logo.svg](reference/coc-logo.svg), palette [color-palette.svg](reference/color-palette.svg), semantic tree [dom-tree.html](reference/dom-tree.html), and screen snapshots in [screens/](reference/screens/). The target is a quiet technical workspace: indigo primary actions/focus, navy project navigation, white work surfaces, slate text, and amber management-sheet-owned content.

All controls need a visible keyboard focus treatment, an accessible name, and a non-colour cue for selection, errors, and destructive actions. Responsive layouts may reflow controls but cannot remove primary actions or page titles.

## State and quality requirements

* Every server-backed screen has loading, empty, and recoverable error states.
* Mutations show in-context busy feedback and retain draft work on failure where possible.
* Enter commits inline edits; Escape cancels an edit or clears selection; Delete/Backspace only delete selected canvas objects outside inputs. Table/sheet shortcuts are specified in the acceptance criteria.
* Mouse, keyboard, and screen-reader operation are required. Every drag interaction needs an equivalent keyboard command before release.

## Reference package manifest

| Asset | Purpose |
| --- | --- |
| reference/coc-logo.svg | Approved COC mark and wordmark. |
| reference/color-palette.svg | Brand, navigation, canvas, and management colours. |
| reference/dom-tree.html | Semantic DOM-tree export for implementation and test planning. |
| reference/screens/login.svg | Login desktop visual target. |
| reference/screens/home.svg | Home desktop visual target. |
| reference/screens/project-shell.svg | Project shell and Context desktop visual target. |
