# 04 — Authentication, invites, and sessions

## 1. Principles

- Private site. **No sign-up.** The only ways to get an account are an admin invite or the first-admin script.
- Supabase Auth is used **only to store and verify passwords**, called from the API. The browser never receives a Supabase token.
- The app uses its **own server-side sessions** (`sessions` table). This gives instant termination and a strict idle timeout.

## 2. Session design

| Item | Value |
|---|---|
| Token | 32 random bytes, base64url, generated with a cryptographic RNG |
| Stored in DB | SHA-256 hash of the token (never the raw token) |
| Cookie name | `sid` |
| Cookie flags | `HttpOnly; Secure; SameSite=Lax; Path=/; Domain=.<root-domain>` (omit `Domain` and `Secure` only in local dev via `COOKIE_SECURE=false`) |
| Idle timeout | **30 minutes** since `last_active_at` |
| Absolute lifetime | **12 hours** since `created_at` `[ASSUMPTION]` |
| CSRF token | Random value stored on the session row, returned by `GET /api/v1/me`, sent back in header `X-CSRF-Token` on every `POST`, `PUT`, `PATCH`, `DELETE` |
| Session fixation | A new session is created at every sign-in; old cookie is ignored |

### Session check (every authenticated request)

1. Read `sid` cookie. Missing → `401`.
2. Hash it and find the session. Not found → `401`.
3. Reject (and mark `revoked_reason = 'idle'` if idle) when any of these is true: `revoked_at` is set, `expires_at < now`, `now - last_active_at > 30 min`.
4. Load the profile. Reject if `status != 'active'`.
5. Update `last_active_at = now` **at most once per 60 seconds** (to limit writes).
6. For mutating methods, require a matching `X-CSRF-Token` (constant-time compare). Mismatch → `403`.

### Frontend idle handling

- Track user activity (mouse, key, scroll, touch, fetch) and keep a local timer.
- At **28 minutes** idle, show a dialog "You will be signed out in 2 minutes" with a **Stay signed in** button that calls `GET /api/v1/me` (which refreshes `last_active_at`).
- At 30 minutes, call `POST /api/v1/auth/sign-out`, clear client state, go to `/sign-in?reason=idle`.
- Any `401` from the API clears client state and goes to `/sign-in?next=<current path>`.
- Unsaved editor changes: autosave before sign-out when possible; otherwise keep a local draft in memory only and warn.

## 3. Sign-in flow

`POST /api/v1/auth/sign-in` with `{ email, password }`.

1. Normalize email to lowercase and trim.
2. **Rate limit** by IP: 20 attempts per 15 minutes. Exceeded → `429`.
3. Look up the profile. If missing, still run a dummy password check (so timing looks the same) and return the generic error.
4. If `locked_until > now` → generic error `AUTH_INVALID` plus a `Retry-After` header. Do not reveal that the account is locked beyond the generic message "Too many attempts. Try again later." `[Use this same message for both unknown and locked emails.]`
5. If `status = 'deactivated'` → generic error.
6. Verify password through Supabase Auth `signInWithPassword` **server-side** (discard the returned Supabase session; do not send it to the client).
7. On failure: `failed_login_count += 1`. On the 5th consecutive failure set `locked_until = now + 15 min` and reset the counter. Insert `login_attempts`. Audit `auth.sign_in_failed` (and `auth.account_locked` when locking).
8. On success: reset `failed_login_count` and `locked_until`, set `last_login_at`, create a session, set the cookie, audit `auth.sign_in`. Return `{ user, csrfToken }`.

Generic error body: `{ "error": { "code": "AUTH_INVALID", "message": "Email or password is incorrect." } }`

## 4. Sign-out

`POST /api/v1/auth/sign-out` sets `revoked_at`, `revoked_reason = 'logout'`, clears the cookie, audits `auth.sign_out`.

## 5. Invites

### Create (admin)
`POST /api/v1/admin/invites` with `{ email, role, expiresIn: "24h" | "72h" | "7d", spaceIds?: uuid[] }`.
1. Reject if a profile with that email already exists, or an open invite exists (offer resend).
2. Generate a 32-byte random token; store its SHA-256 hash; compute `expires_at`.
3. Send the email with the link `https://<frontend>/invite/<raw-token>`. The raw token is shown **only** in the email, never stored and never returned by the API.
4. Audit `invite.created`.

### Accept (public)
- `GET /api/v1/invites/:token` returns `{ email, role, expiresAt }` if valid, else `404` with a generic message.
- `POST /api/v1/invites/:token/accept` with `{ fullName, password }`:
  1. Validate the token (exists, not expired, not accepted, not revoked).
  2. Validate password (12+ characters, not in the common-password list, not equal to the email).
  3. Create the Supabase Auth user with `email_confirm: true`, then insert `profiles`.
  4. Add `space_members` rows for `space_ids` that are still `restricted`.
  5. Mark the invite accepted. Create a session and sign the user in. Audit `invite.accepted`.
- Resend: creates a new token, invalidates the old one, resets expiry. Revoke: sets `revoked_at`.

## 6. Forgot and reset password `[ASSUMPTION]`

- `POST /api/v1/auth/forgot-password` `{ email }` always returns `204`, whatever the email. If the account is active, create a reset token (1 hour) and email the link.
- `POST /api/v1/auth/reset-password` `{ token, password }` sets the new password in Supabase Auth, marks the token used, **revokes all sessions** of that user, audits `auth.password_reset`.
- Admin can send a reset link to a user (`POST /api/v1/admin/users/:id/send-reset`).

## 7. Change password (signed in)

`POST /api/v1/me/password` `{ currentPassword, newPassword }`. On success revoke **all other** sessions, keep the current one. Audit `auth.password_changed`.

## 8. Session termination (admin)

| Action | Endpoint | Effect |
|---|---|---|
| End one session | `DELETE /api/v1/admin/sessions/:id` | Set `revoked_at`, `revoked_by`, `revoked_reason = 'admin'`. The user is signed out on their next request. |
| End all sessions of a user | `DELETE /api/v1/admin/users/:id/sessions` | Same, for every active session of that user |
| Deactivate user | `POST /api/v1/admin/users/:id/deactivate` | Set `status = 'deactivated'`, revoke all sessions |

Because the session check runs on **every request**, termination takes effect immediately (no waiting for a token to expire).

Users can also end their own other sessions from `/settings/security`.

## 9. Password rules

- Minimum **12** characters, maximum 128.
- Reject passwords found in the top 1000 common passwords (bundle a list in `packages/shared`).
- Reject a password equal to the email or the part before `@`.
- No composition rules (no forced symbols), no periodic expiry.

## 10. Audit events from this area

`auth.sign_in`, `auth.sign_in_failed`, `auth.account_locked`, `auth.sign_out`, `auth.password_changed`, `auth.password_reset`, `session.terminated`, `session.terminated_all`, `invite.created`, `invite.resent`, `invite.revoked`, `invite.accepted`.

## 11. Edge cases to handle

- Demoting, deactivating, or deleting the **last active admin** is blocked (`409 LAST_ADMIN`).
- An admin who deactivates themselves is blocked.
- Deleting a user: remove profile and Supabase Auth user; keep their pages and comments, shown as "Deleted user" (use `on delete set null` or a placeholder profile; decide in migration and keep audit rows intact).
- Email changes are out of scope in v1.
