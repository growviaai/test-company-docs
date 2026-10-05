# 01 — Product requirements

## 1. Goal

A private, invite-only documentation website for one company, with a GitBook-like experience.

## 2. Users and roles

| Role | Who | Summary |
|---|---|---|
| Admin | Company owner or IT | Everything a Member can do, plus manage users, invites, sessions, spaces, and see the audit log |
| Member | Employee | Reads and edits docs in spaces they can access, comments, uses search |

Full permission table: `05-roles-permissions.md`.

## 3. Pages and routes

| Route | Screen | Who |
|---|---|---|
| `/sign-in` | Sign in | Public |
| `/invite/:token` | Accept invite and set password | Public (valid token) |
| `/forgot-password` | Request reset link | Public |
| `/reset-password/:token` | Set new password | Public (valid token) |
| `/` | Home: spaces list, recently edited pages, my mentions | Signed in |
| `/s/:spaceSlug` | Space home (redirects to the first page) | Space access |
| `/s/:spaceSlug/:pageSlug...` | Read or edit a page | Space access |
| `/search` | Search results | Signed in |
| `/notifications` | Notification list | Signed in |
| `/settings/profile` | Name, notification preferences | Signed in |
| `/settings/security` | Change password, my active sessions | Signed in |
| `/admin/users` | User list and actions | Admin |
| `/admin/invites` | Invites list and creation | Admin |
| `/admin/sessions` | All active sessions | Admin |
| `/admin/spaces` | Create, edit, restrict, archive spaces | Admin |
| `/admin/trash` | Deleted pages, restore | Admin |
| `/admin/audit-log` | Audit log with filters and CSV export | Admin |
| `*` | 404 page | Anyone |

Unauthenticated visits to any non-public route redirect to `/sign-in?next=<path>`.

## 4. Features

### 4.1 Authentication
- No sign-up screen, no sign-up endpoint. Users exist only via invite or the first-admin script.
- Email and password sign-in. Password: minimum 12 characters (also reject the 1000 most common passwords).
- After 5 failed attempts for an account, lock it for 15 minutes. Show a generic message that does not reveal whether the email exists.
- Sessions end after 30 minutes with no activity. The UI warns at 28 minutes and signs out at 30.
- Details: `04-auth-and-sessions.md`.

### 4.2 Admin panel (`06-admin-panel.md`)
- Invite users by email with an expiry (24h, 72h default, 7d). Choose role and optional starting spaces. Resend or revoke an invite.
- Terminate **one** session or **all** sessions of a user, effective immediately.
- Deactivate a user (blocks sign-in, ends all sessions), reactivate, or permanently delete.
- Change a user's role. Block removing or demoting the **last active admin**.
- Manage spaces and their member lists.
- View the audit log.

### 4.3 Spaces and pages (`07-docs-editor.md`)
- A **Space** is a top-level collection (for example "HR Policies").
- A space has a **Visibility**: `all` (every signed-in member) or `restricted` (only listed members and admins).
- Inside a space: nested **Pages** and **Groups** (a group is a folder-like heading that holds pages). Drag to reorder and move.
- Every page has: title, optional emoji, optional description, content, slug.

### 4.4 Editor
Blocks: paragraph, heading 1–3, bullet list, ordered list, task list, code block, image, file attachment, table, hint (info, success, warning, danger). Inline: bold, italic, strikethrough, inline code, link. Insert with a `/` menu. A floating toolbar appears on text selection. Autosave. Details: `07-docs-editor.md`.

### 4.5 Uploads
Images, PDFs and files up to **25 MB** each, stored privately in Supabase Storage and only reachable through short-lived signed links after a permission check.

### 4.6 Version history
Every page keeps versions. Show who changed it and when, preview an old version, and restore it (creates a new version; nothing is lost). Restore: author or admin only.

### 4.7 Comments
Page-level comments with one level of replies and `@mentions`. Edit and delete own comments. Admins can delete any comment.

### 4.8 Notifications
When someone @mentions you or replies to your comment: an in-app notification plus an email. Users can switch email notifications on or off in settings.

### 4.9 Search
Full-text search across page titles, descriptions and content, limited to spaces the user can access. Show highlighted snippets. Quick open with `Ctrl/Cmd + K`.

### 4.10 Audit log
Append-only record of admin and security events. See `09-search-versions-audit.md`.

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | No page, file, or API route is readable without a valid session. No indexing by search engines (`noindex`, `X-Robots-Tag`) |
| Performance | Page loads under 2 s on a normal connection. Search under 500 ms for up to 10,000 pages |
| Accessibility | Keyboard usable, visible focus, labelled controls, color contrast AA |
| Browsers | Latest two versions of Chrome, Edge, Firefox, Safari. Responsive down to 360 px width |
| Language | English only. Keep strings in one file so translation is possible later |
| Themes | Light, dark, and system. Toggle in the header. Saved in `localStorage` |

## 6. Out of scope for v1

Public pages, sign-up, social login, 2FA, real-time co-editing, change requests and review flow, tabs/cards/expandable/stepper/Mermaid blocks, quote and divider blocks, embeds, translations, API tokens, analytics, AI features, mobile apps.

## 7. Acceptance summary

The product is done when every item in `14-build-plan.md` is checked and the checklist in `12-security.md` passes.
