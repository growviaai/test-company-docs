# 09 — Search, version history, and audit log

## 1. Search

### Behavior
- Full-text search over page **title** (weight A), **description** (B), and **content** (C).
- Results only from spaces the user can access. The API computes `accessible_space_ids` and passes it to `search_pages` (see `03-database-schema.md`).
- Query syntax: plain words, quoted phrases, `-word` to exclude, `or`. (Uses `websearch_to_tsquery`.)
- Minimum 2 characters. Maximum 200. Empty query returns nothing.
- Results show: title, space name and path, highlighted snippet, and last updated.
- Groups are not searchable (pages only). Deleted pages are never returned.

### UI
- `Ctrl/Cmd + K` opens a command palette-style dialog: input at the top, results list below, arrow keys to move, Enter to open, Esc to close. Show the 8 best results; "See all results" goes to `/search?q=`.
- Sidebar page filter ("Find pages…") filters the tree by title only, client-side.
- `/search` page: results list with pagination (20 per page) and a filter by space.

### Content to plain text
On every page save the API walks the TipTap JSON and joins text from paragraphs, headings, lists, table cells, code blocks, hint text, image captions/alt text, and file names. Store it in `content_text` (cap at 200,000 characters).

### Safety
Return the snippet with only `<mark>` tags allowed. Escape everything else. The frontend renders the snippet through a tiny whitelist renderer, not `dangerouslySetInnerHTML` with raw input.

## 2. Version history

### When a version is created
| Trigger | `reason` |
|---|---|
| Autosave, but only if the last version is older than **5 minutes** or was made by another user | `autosave` |
| User clicks **Save version** (optional note is not stored in v1) | `manual` |
| Restore from an old version | `restore` |
| Page is deleted (snapshot just before) | `delete` |

`version_no` increases by 1 for each page. Always keep every version in v1.

### UI (right side panel or dialog "Version history")
- List newest first: date/time, author name, reason badge.
- Click a version to **preview** it read-only (rendered with the same renderer).
- Optional: a simple side-by-side or inline text diff. `[nice to have, not required in v1]`
- **Restore this version** button: visible to the page **author and admins** only. Confirm dialog "Restore this version? The current content is saved as a new version first."
- Restoring: save the current state as a version (`restore` is the **new** one), then write the old content into the page, bump `revision`, audit `page.version_restored`.

### API
`GET /pages/:id/versions`, `GET /pages/:id/versions/:versionNo`, `POST /pages/:id/versions/:versionNo/restore`. See `10-api-spec.md`.

## 3. Audit log

### Rules
- Append-only (database trigger blocks update and delete).
- Written by the API **in the same request** as the action.
- Stores: actor, action, target type and id, small metadata JSON, IP, user agent, time.
- Never store passwords, tokens, or page content in metadata. Store IDs and titles only.
- Visible to admins only at `/admin/audit-log`.

### Actions to record

| Area | Actions |
|---|---|
| Auth | `auth.sign_in`, `auth.sign_in_failed`, `auth.account_locked`, `auth.sign_out`, `auth.password_changed`, `auth.password_reset` |
| Sessions | `session.terminated`, `session.terminated_all`, `session.expired_idle` (optional) |
| Invites | `invite.created`, `invite.resent`, `invite.revoked`, `invite.accepted` |
| Users | `user.role_changed`, `user.deactivated`, `user.reactivated`, `user.deleted`, `user.reset_link_sent` |
| Spaces | `space.created`, `space.updated`, `space.archived`, `space.unarchived`, `space.visibility_changed`, `space.member_added`, `space.member_removed` |
| Pages | `page.created`, `page.deleted`, `page.restored_from_trash`, `page.purged`, `page.moved`, `page.version_restored` |
| Comments | `comment.deleted_by_admin` |
| Files | `attachment.uploaded`, `attachment.deleted` |
| System | `system.first_admin_created`, `email.failed` |

Page edits (every autosave) are **not** audited; version history covers them.

### Metadata examples
```json
{ "from": "member", "to": "admin" }                       // user.role_changed
{ "title": "Leave policy", "spaceSlug": "hr" }            // page.deleted
{ "sessionId": "…", "userAgent": "Chrome on Windows" }    // session.terminated
```

### UI
- Table: time, actor, action (human label), target, IP. Newest first, 50 per page, cursor pagination.
- Filters: date range, actor (search user), action (multi-select), target type.
- Row click opens a drawer with full metadata JSON (pretty-printed).
- **Export CSV** of the current filter (max 10,000 rows per export).
- Human-readable labels, for example `user.role_changed` → "Changed a user's role".

## 4. Acceptance criteria

- A member cannot find a page from a restricted space they cannot access via search, even by exact title.
- Restoring a version creates new history and never deletes old versions.
- Trying to update or delete an audit row from SQL or the API fails.
- Each action in the table above produces exactly one audit entry.
