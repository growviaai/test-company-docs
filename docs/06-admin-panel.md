# 06 — Admin panel

Only `admin` users can open `/admin/*`. The API enforces this (`403`), and the frontend hides the Admin entry from members. Visual style follows `11-design-system.md` (same list, table, dialog, and button styles as the rest of the app).

## 1. Layout

- Left sidebar section "Admin": Users, Invites, Sessions, Spaces, Trash, Audit log.
- Page header uses the 24px/500 heading style, with a primary action button on the right.
- Tables: bordered panel, 12px radius, header row in muted text, row hover `gray-3`.
- Empty states: centered icon, short title, one-line hint, and a primary action.

## 2. Users (`/admin/users`)

| Column | Notes |
|---|---|
| Name and email | Avatar initials, name, email |
| Role | `Admin` or `Member` badge |
| Status | `Active` (green badge) or `Deactivated` (gray badge) |
| Last sign-in | Relative time |
| Active sessions | Count, link to the sessions view filtered to the user |

Toolbar: search by name or email, filter by role and status, **Invite user** button.

Row menu actions (each opens a confirm dialog when destructive):

| Action | Endpoint | Rules |
|---|---|---|
| Change role | `PATCH /admin/users/:id` | Block if it would remove the last admin |
| Terminate all sessions | `DELETE /admin/users/:id/sessions` | Shows how many sessions will end |
| Send password reset link | `POST /admin/users/:id/send-reset` | |
| Deactivate | `POST /admin/users/:id/deactivate` | Ends all sessions. Not allowed on self or the last admin |
| Reactivate | `POST /admin/users/:id/reactivate` | |
| Delete | `DELETE /admin/users/:id` | Requires typing the user's email to confirm. Not allowed on self or the last admin |

User detail drawer: profile info, spaces they can access, recent audit entries about them, and their active sessions with a **Terminate** button on each.

## 3. Invites (`/admin/invites`)

Create form (dialog):
- Email (required)
- Role: Member (default) or Admin
- Expiry: 24 hours, **72 hours (default)**, 7 days
- Starting spaces: optional multi-select (only restricted spaces matter; show all)

List with tabs: **Pending**, **Accepted**, **Expired or revoked**. Columns: email, role, invited by, sent, expires, status. Row actions: **Resend** (new link, new expiry), **Revoke**, **Copy link is not available** (the raw token is never stored; to get a new link use Resend).

Show a success toast "Invite sent to <email>". If the email send fails, show an error and keep the invite (admin can resend).

## 4. Sessions (`/admin/sessions`)

Table of **active** sessions across all users.

| Column | Notes |
|---|---|
| User | Name and email |
| Device | Browser and OS parsed from user agent |
| IP | |
| Signed in | Date and time |
| Last active | Relative time |
| Expires | Earlier of idle expiry and absolute expiry |

Actions: **Terminate** (single, confirm dialog), and a bulk **Terminate all for user** from the user filter. After terminating, the row disappears and an audit record is created. Auto-refresh every 30 seconds.

## 5. Spaces (`/admin/spaces`)

- List of spaces with name, visibility badge (`Everyone` or `Restricted`), member count, page count, archived state.
- **New space** dialog: name, slug (auto from name, editable), emoji, description, visibility.
- Edit space: same fields.
- Restricted spaces show a **Members** panel: add or remove members (search users). Admins are implicit and shown as "All admins".
- Switching `restricted` → `all` asks for confirmation ("Everyone who signs in will see this space").
- Switching `all` → `restricted` requires choosing at least one member (admins excluded from the count).
- **Archive** hides the space from members and makes it read-only. **Unarchive** reverses it. No hard delete in v1 (use archive).
- Drag to reorder the spaces list (`position`).

## 6. Trash (`/admin/trash`)

List deleted pages (title, space, deleted by, deleted at). Actions: **Restore** (back to original location, or to the space root if the parent is gone) and **Delete permanently** (admin only, confirm, writes audit). Pages in the trash are purged automatically after 90 days `[ASSUMPTION]`.

## 7. Audit log (`/admin/audit-log`)

See `09-search-versions-audit.md`. Filters: date range, actor, action type, target. Export current filter to CSV.

## 8. Settings that are fixed in v1

No settings screen. These are constants in `packages/shared/constants.ts`:
`IDLE_TIMEOUT_MINUTES = 30`, `SESSION_MAX_HOURS = 12`, `LOCKOUT_MINUTES = 15`, `LOCKOUT_THRESHOLD = 5`, `MIN_PASSWORD_LENGTH = 12`, `INVITE_DEFAULT_HOURS = 72`, `MAX_UPLOAD_BYTES = 26214400`.

## 9. Acceptance criteria

- A member who opens `/admin/*` sees a 403 page and the API returns 403.
- Terminating a session makes that user's next request fail with 401 within seconds, and the UI returns them to sign-in.
- Demoting the last admin shows an inline error and changes nothing.
- Every action above creates an audit log entry with actor, target, and IP.
