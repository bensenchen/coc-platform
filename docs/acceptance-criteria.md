# COC Platform acceptance criteria

## Test conventions

* **Roles:** Visitor = unauthenticated; Member = workspace viewer; Editor = project author; Admin = workspace administrator.
* **Route variables:** :ws, :project, and :pageId identify an authorized workspace, project, and page unless stated otherwise.
* **States:** Each interaction specifies loading, empty, and error behavior. “N/A” means local-only, but it still must not crash or lose focus. Network errors are announced in the affected region and offer retry.
* **Visual target:** Use [reference/](reference/). Focus uses a visible indigo ring; destructive controls use red plus text/icon, never colour alone.

## Login

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| Password sign-in | /login; Visitor | Disable submit and show progress while authenticating. Empty required fields give field feedback. Invalid credentials stay on Login with safe inline error. | Tab: email → password → submit → alternates. Enter submits; failed field receives focus. | Centered white card on slate; screens/login.svg. |
| Magic link | /login; Visitor | Empty email says “Enter your email first.” Disable controls while sending; failure is inline; success announces “Magic link sent.” | Tab/Enter/Space activate; focus moves to success status. | Secondary outlined action below divider; screens/login.svg. |
| Google and sign-up | /login; Visitor | Google shows progress until redirect; initiation failure is inline. Route failure retains Login. | Tab/Enter/Space activate; browser Back returns safely. | Equal-width secondary controls and visible link; screens/login.svg. |

## Home

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| Load/select workspace | /home; Member | Spinner while loading. None shows “Start with a workspace” and create CTA. Fetch failure offers retry and preserves selection. | Cards are buttons: Tab, Enter, Space; selected state announced. | Hero, cards, indigo selected state; screens/home.svg. |
| Create workspace | /home; Member | Busy/disabled submit; invalid name is inline; API failure retains draft/retry; success closes and selects workspace. | Focus trap; Enter submits valid form; Escape/cancel restores CTA focus. | Primary hero CTA and secondary New workspace; screens/home.svg. |
| Create/open project | /home; Editor create, Member open | Project list waits on workspace. Empty names workspace and offers create. Failure offers retry; successful open navigates. | Cards/CTAs use Tab/Enter/Space; dialog follows create focus rules. | Violet project accent; screens/home.svg. |
| Account/settings/sign out | /home; Member; settings Admin | Fallback identity is safe. Sign-out is disabled while pending; failure retains session. | Header controls Tab/Enter/Space; successful sign-out focuses Login heading. | Compact branded header; screens/home.svg. |

## Project shell

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| Resolve workspace/project | /w/:ws/p/:project; Member | Centered loader. Unknown/unauthorized workspace redirects Home. Fetch failure gives retry/Home. No page says what to do. | Route focuses main heading/no-page state. | Navy sidebar, light resize rail, white/slate main; screens/project-shell.svg. |
| Switch workspace/project and Home | Project routes; Member | Menus show loading/empty/error. Unavailable item is explained/disabled; failed switch preserves route. | Tab to controls; Enter/Space opens/selects; Escape closes and restores trigger focus. | Switchers below Home; screens/project-shell.svg. |
| Resize/collapse navigation | Project routes; Member | N/A; width has usable min/max; empty groups stay labelled. | Separator has arrow-key resizing and announced value; section buttons toggle with Enter/Space. | Muted uppercase group labels; screens/project-shell.svg. |
| Create/open/rename/delete page | Project routes; Editor | Create dialog handles busy/validation/retained draft. Empty group says “empty.” Rename failure retains draft; delete confirms and on success selects no/adjacent page. | Rows/menu Tab accessible; Enter opens/commits; Escape cancels; confirm defaults to Cancel. | Blue active row; red destructive menu. |

## Context

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| Load/select canvas | Context page; Member | Spinner while objects load. Empty canvas is usable. Fetch failure provides retry/no corrupt objects. | Canvas has label/instructions; Escape clears selection/drawing; selected object supports keyboard nudge. | Toolbar + light canvas + reserved white properties panel; screens/project-shell.svg. |
| Draw shapes/connectors | Context page; Editor | Creation has pending state; failed save removes/reverts provisional object and announces error. Empty accepts first object. | Toolbar Tab/Enter/Space; Escape cancels preview; keyboard endpoint choice matches click flow. | Active tool blue; shapes/endpoints distinct. |
| Edit object/view | Context page; Editor | Update/delete pending; failure restores prior value/selection and retries. No selection leaves fixed panel blank. | Delete/Backspace only outside inputs; Enter commits name; Escape cancels; movement/resize/delete have keyboard equivalents. | Compact labelled properties, full-width red Delete. |
| Pan/zoom/fit | Context page; Member | N/A; Fit disabled/explained if bounds unavailable. | Tab/Enter/Space; + / - and documented fit shortcut do not steal input focus. | Percentage sits between zoom buttons. |

## Org

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| View settings/members | /admin; Admin | Loading region; empty roster/invitations explains absence. Unauthorized Member goes Home with message; fetch error retries. | Heading gets route focus; rows/actions have logical Tab order. | Home white surfaces, slate type, indigo actions; screens/home.svg palette. |
| Invite/change role/remove | /admin; Admin | Affected control busy only. Invalid email inline; failures retain list/draft and retry. Removing self/last admin is blocked. | Dialog/menu Tab, Enter/Space, Escape, focus return; confirmation defaults Cancel. | Text + badge roles; red confirmed removal. |
| Non-admin restriction | /admin; Visitor/Member | Visitor to Login; Member gets access denied/redirect without roster disclosure. | Redirect target is announced/focusable. | No partial admin form behind restriction. |

## Data

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| Load/add first column | Data page; Member view, Editor add | “Loading data…” while loading. No columns shows CTA. Fetch/create failure retries and preserves typed name. | CTA Tab/Enter/Space; form autofocus; Enter adds; Escape cancels/returns focus. | White toolbar, indigo Row, outlined Column, sticky header. |
| Add/reorder/delete rows/columns | Data page; Editor | Item-level busy. Empty rows valid. Failed reorder/delete restores prior order/item and announces error. | Drag has keyboard move before/after; delete is named/reachable and confirms data loss. | Grab labels and indigo drop target have non-colour labels. |
| Edit cell/header | Data page; Editor | Empty cell begins blank. Save pending; failure retains/reopens draft with error. | Click/double click or Enter/F2 edit; Enter/blur saves; Escape cancels; Tab moves predictably. | Indigo inline input; blank data differs from placeholder. |

## Interface List

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| Create/open one list | Project / Interface List page; Editor create, Member open | No list offers Create List of Interfaces. Busy disables duplicate; failure retains dialog. Existing list hides/disables create. Fetch failure retries. | Sidebar/page row Tab/Enter/Space; dialog Enter/Escape/focus-return. | Clearly labelled Interface group, standard page header. |
| Planned renderer | Interface List page; Member | Intentional labelled placeholder + page ID; loading/error never blank. Empty inventory explains future action. | Heading focusable; no dead controls. | Centered slate placeholder below white header. |

## ICD

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| Open planned renderer | ICD page; Member | Metadata loader; deleted page returns no-page state with notice; renderer error retries. Empty ICD is intentional, not blank. | Title receives route focus; future editor follows Tab/Enter/Escape. | Header says “ICD Page”; placeholder mirrors Interface List. |
| Create/manage entry point | Project route; Editor | Before release, “coming soon” explains no action. After release, dialog uses busy/validation/error behavior. | Entry is reachable; unavailable action explains why. | Interface navigation distinguishes List and ICD. |

## Mgmt

| Interaction | Route / role | Loading, empty, error | Keyboard | Visual target |
| --- | --- | --- | --- | --- |
| Load/link/add structure | Mgmt page; Member view, Editor edit | “Loading…” while resolving. No columns explains standalone/linked absence and CTA. Broken source says “source unavailable”; failure retries/preserves draft. | Link select/control Tab/Enter/Space; column input autofocus; Enter adds; Escape cancels. | White toolbar with amber actions; owned cells/headers amber. |
| Select/edit/reorder | Mgmt page; Editor | “No rows yet” is valid. Mutation failure restores/retains value/order and reports error. | Keyboard range selection/extension replaces mouse drag; Enter/F2 edits; Enter saves; Escape cancels/deselects; keyboard move commands replace drag. | Indigo inset range; linked/owned content labelled. |
| Format/clipboard | Mgmt page; Editor | Format bar only with selection. Clipboard permission/failure reports error and retains selection; format failure restores formatting. | Ctrl/Cmd+C/V TSV; Ctrl/Cmd+B/I formatting; Escape deselects; toolbar Tab accessible. | Compact slate bar; active indigo; colours have labels/tooltips. |
| Delete/clear | Mgmt page; Editor | Deletion/clear pending and recoverable; no rows/columns returns appropriate empty state. | Named delete + confirmation; clear/deselect Enter/Space. | Red delete has non-hover keyboard visibility. |
