# 10 — API specification

Base path: `/api/v1`. JSON only. All times in ISO 8601 UTC. IDs are UUIDs. The shared zod schemas live in `packages/shared`.

## 1. Conventions

- Auth: cookie `sid`. Mutating requests also need header `X-CSRF-Token`.
- Success: `200` with the object, `201` on create, `204` with no body.
- Errors:
```json
{ "error": { "code": "FORBIDDEN", "message": "You do not have permission.", "details": {} } }
```
- Common codes: `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `VALIDATION_FAILED` 422 (with `details.fields`), `REVISION_CONFLICT` 409, `LAST_ADMIN` 409, `RATE_LIMITED` 429, `AUTH_INVALID` 401, `INTERNAL` 500.
- Pagination: `?limit=50&cursor=<opaque>` → `{ items: [...], nextCursor: string | null }`.
- Every response has `X-Request-Id`.
- Rate limits (per IP unless stated): sign-in 20 / 15 min; forgot-password 5 / hour; invite accept 10 / hour; all other authenticated routes 300 / min per user.

Legend: **P** = public, **U** = any signed-in user, **A** = admin only.

## 2. Auth

| Method and path | Who | Body → Response |
|---|---|---|
| `POST /auth/sign-in` | P | `{email,password}` → `{user, csrfToken}` and sets cookie |
| `POST /auth/sign-out` | U | → `204` |
| `POST /auth/forgot-password` | P | `{email}` → `204` always |
| `POST /auth/reset-password` | P | `{token,password}` → `204` |
| `GET /invites/:token` | P | → `{email, role, expiresAt}` |
| `POST /invites/:token/accept` | P | `{fullName,password}` → `{user, csrfToken}` and sets cookie |

## 3. Me

| Method and path | Who | Body → Response |
|---|---|---|
| `GET /me` | U | → `{user, csrfToken, sessionExpiresAt}` (also refreshes activity) |
| `PATCH /me` | U | `{fullName?, emailNotifications?}` → `{user}` |
| `POST /me/password` | U | `{currentPassword,newPassword}` → `204` |
| `GET /me/sessions` | U | → `[{id, device, ip, createdAt, lastActiveAt, current}]` |
| `DELETE /me/sessions/:id` | U | → `204` (not allowed for another user's session) |
| `DELETE /me/sessions` | U | Ends all **other** sessions → `204` |

`user` shape: `{ id, email, fullName, role, status, emailNotifications }`.

## 4. Admin: users, invites, sessions

| Method and path | Who | Notes |
|---|---|---|
| `GET /admin/users?q=&role=&status=&cursor=` | A | List |
| `GET /admin/users/:id` | A | Detail with sessions |
| `PATCH /admin/users/:id` | A | `{role?, fullName?}`, `409 LAST_ADMIN` guard |
| `POST /admin/users/:id/deactivate` | A | Ends all sessions |
| `POST /admin/users/:id/reactivate` | A | |
| `DELETE /admin/users/:id` | A | Body `{confirmEmail}` must match |
| `POST /admin/users/:id/send-reset` | A | |
| `DELETE /admin/users/:id/sessions` | A | Terminate all |
| `GET /admin/sessions?userId=` | A | Active sessions |
| `DELETE /admin/sessions/:id` | A | Terminate one |
| `GET /admin/invites?status=pending|accepted|closed` | A | |
| `POST /admin/invites` | A | `{email, role, expiresIn, spaceIds?}` |
| `POST /admin/invites/:id/resend` | A | New token and expiry |
| `DELETE /admin/invites/:id` | A | Revoke |
| `GET /admin/audit-logs?from=&to=&actorId=&action=&targetType=&cursor=` | A | |
| `GET /admin/audit-logs/export.csv?...` | A | Streams CSV |
| `GET /admin/trash` | A | Deleted pages |
| `POST /admin/trash/:pageId/restore` | A | |
| `DELETE /admin/trash/:pageId` | A | Permanent |
| `GET /admin/email-outbox?status=failed` | A | Failed emails, with `POST /admin/email-outbox/:id/retry` |

## 5. Spaces

| Method and path | Who | Notes |
|---|---|---|
| `GET /spaces` | U | Spaces the user can access, ordered by `position` |
| `POST /spaces` | A | `{name, slug?, emoji?, description?, visibility}` |
| `GET /spaces/:slug` | U | 404 if no access |
| `PATCH /spaces/:id` | A | Includes visibility and `archived` |
| `PUT /spaces/order` | A | `{ids: []}` |
| `GET /spaces/:id/members` | A | |
| `PUT /spaces/:id/members` | A | `{userIds: []}` replaces the list |

## 6. Pages

| Method and path | Who | Notes |
|---|---|---|
| `GET /spaces/:spaceId/tree` | U | Light tree: `id, parentId, kind, title, slug, emoji, position` |
| `GET /pages/:id` | U | Full page with `content`, `revision`, `createdBy`, `updatedBy` |
| `GET /spaces/:spaceId/resolve?path=a/b/c` | U | Resolve a URL path to a page |
| `POST /spaces/:spaceId/pages` | U | `{kind, title, parentId?, position?}` |
| `PATCH /pages/:id` | U | `{title?, slug?, description?, emoji?, content?, revision}` → new `revision`. `409 REVISION_CONFLICT` if stale |
| `POST /pages/:id/move` | U | `{spaceId?, parentId, position}` |
| `POST /pages/:id/duplicate` | U | |
| `DELETE /pages/:id` | U | Author or admin. Soft delete |
| `GET /pages/:id/versions` | U | List |
| `GET /pages/:id/versions/:no` | U | One version with content |
| `POST /pages/:id/versions` | U | Manual snapshot |
| `POST /pages/:id/versions/:no/restore` | U | Author or admin |
| `PUT /pages/order` | U | Bulk reorder `{spaceId, items:[{id,parentId,position}]}` |

## 7. Comments and notifications

| Method and path | Who | Notes |
|---|---|---|
| `GET /pages/:id/comments` | U | Threaded, oldest first |
| `POST /pages/:id/comments` | U | `{body, parentId?}` |
| `PATCH /comments/:id` | U | Own comment only |
| `DELETE /comments/:id` | U | Own, or admin |
| `GET /pages/:id/mentionable?q=` | U | Users who can access the space |
| `GET /notifications?unread=1&cursor=` | U | |
| `GET /notifications/unread-count` | U | `{count}` |
| `POST /notifications/:id/read` | U | |
| `POST /notifications/read-all` | U | |

## 8. Search

`GET /search?q=&spaceId=&cursor=` → `{ items: [{pageId, spaceSlug, path, title, snippet, updatedAt}], nextCursor }` (U).

## 9. Uploads

| Method and path | Who | Notes |
|---|---|---|
| `POST /uploads/sign` | U | `{spaceId,pageId?,fileName,mimeType,sizeBytes}` → `{attachmentId, uploadUrl, token}` |
| `POST /uploads/:id/complete` | U | Verifies type and size → `{attachment}` |
| `GET /attachments/:id/url` | U | → `{url, expiresAt}` (60 s) |
| `DELETE /attachments/:id` | U | Uploader or admin |

## 10. Health

`GET /health` (P) → `{ ok: true }`. No version or environment details.

## 11. CORS

Allow only `FRONTEND_ORIGIN`. Methods `GET, POST, PATCH, PUT, DELETE, OPTIONS`. Headers `Content-Type, X-CSRF-Token`. `credentials: true`. `Vary: Origin`. Preflight cache 10 minutes.

## 12. Testing the API

Write Vitest integration tests with a test Supabase project or a local Postgres. Cover at minimum: sign-in success/failure/lockout, idle expiry, session termination, invite accept and expiry, every permission row, revision conflict, version restore, search access filtering, and upload type/size rejection.
