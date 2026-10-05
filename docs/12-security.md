# 12 — Security requirements and checklist

This is a private company knowledge base. Treat every item as required. A failed item blocks release.

## 1. Threats we design against

| Threat | Main defenses |
|---|---|
| Stolen or guessed password | 12+ char passwords, common-password blocklist, lockout after 5 failures, IP rate limit |
| Account enumeration | Same message and timing for unknown email, wrong password, and locked account. Forgot-password always returns 204 |
| Stolen session cookie | HttpOnly, Secure, short idle timeout, 12h absolute limit, admin can terminate sessions, sessions revoked on password change |
| CSRF | SameSite=Lax cookie, CSRF token header on every mutating request, strict CORS allowlist |
| XSS | No raw HTML rendering, server-side content schema validation, CSP, safe link schemes, sanitized search snippets |
| Broken access control | One permission layer in the API, tests for the whole matrix, 404 for hidden spaces |
| Malicious uploads | Type and size allowlist, magic-number check, no SVG/HTML, private bucket, signed URLs (60 s), attachment disposition |
| SQL injection | Parameterized queries through the Supabase client; never string-build SQL |
| Leaked secrets | Secrets only in server env vars, never in the repo or the browser |
| Insider mistakes | Audit log, soft delete, version history, last-admin guard |

## 2. Authentication and sessions

- [ ] Public sign-up disabled in Supabase and no sign-up endpoint exists.
- [ ] Session tokens are random 32 bytes; only the SHA-256 hash is stored.
- [ ] Cookie flags: `HttpOnly; Secure; SameSite=Lax`.
- [ ] Idle timeout 30 min enforced **on the server**, not only in the UI.
- [ ] Absolute lifetime 12 h enforced.
- [ ] Terminating a session or deactivating a user blocks the next request.
- [ ] Password change and reset revoke other sessions.
- [ ] Lockout after 5 failures for 15 minutes; counters reset on success.
- [ ] Invite and reset tokens: random, hashed in DB, single use, expire, constant-time compare.
- [ ] Passwords are never logged, emailed, or returned by any endpoint.

## 3. Authorization

- [ ] Every route calls a permission helper. Missing check = bug.
- [ ] Space access rule applied to pages, versions, comments, attachments, search, notifications.
- [ ] Unit tests cover every row in `05-roles-permissions.md`.
- [ ] Last-admin and self-lockout guards exist and are tested.

## 4. API hardening

- [ ] Input validated with zod on every route. Reject unknown fields.
- [ ] Body size limits (1 MB default JSON; page content max 1 MB).
- [ ] Rate limits as in `10-api-spec.md`. Store counters in Postgres (or an equivalent) because serverless instances do not share memory.
- [ ] CORS allows only `FRONTEND_ORIGIN` with credentials.
- [ ] Security headers on API responses: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` on authenticated JSON, `Referrer-Policy: no-referrer`.
- [ ] Errors never leak stack traces, SQL, or internal ids beyond what is needed.
- [ ] `X-Request-Id` on every response, included in logs.

## 5. Frontend hardening

- [ ] No `dangerouslySetInnerHTML` except the vetted search-snippet renderer.
- [ ] External links: `rel="noopener noreferrer"`, only `http`, `https`, `mailto`.
- [ ] No tokens in `localStorage` or `sessionStorage` (auth is cookie only). Only `theme` is stored.
- [ ] Sign-out clears TanStack Query cache.
- [ ] `<meta name="robots" content="noindex, nofollow">` and a `robots.txt` that disallows everything.

### Content Security Policy (frontend, via `_headers` on Cloudflare Pages or `.htaccess` on Namecheap)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://<project-ref>.supabase.co;
font-src 'self';
connect-src 'self' https://api.example.com https://<project-ref>.supabase.co;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```
Adjust the API domain and Supabase project URL. (`connect-src` needs the Supabase storage URL because uploads go straight to it.) Also send `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` that disables camera, microphone, geolocation.

## 6. Uploads

- [ ] Allowlist of extensions and MIME types; reject others.
- [ ] 25 MB cap enforced at signing and verified after upload.
- [ ] Magic-number check in `complete`.
- [ ] No SVG, HTML, JS, or executables.
- [ ] Bucket is private; access only by 60-second signed URLs after a permission check.
- [ ] File names sanitized; stored path uses ids.

## 7. Data protection and operations

- [ ] Supabase Row Level Security enabled on all tables, with no public policies.
- [ ] Service role key lives only in the Vercel environment (encrypted) and local `.env` files that are git-ignored.
- [ ] Production and development use separate Supabase projects.
- [ ] Backups: confirm the Supabase plan's backup coverage and test a restore once before launch. Consider a periodic `pg_dump` kept off-platform.
- [ ] Enforce HTTPS everywhere. Redirect HTTP to HTTPS.
- [ ] Dependency scanning in CI (`pnpm audit` and GitHub Dependabot).
- [ ] Secret scanning enabled on the Git repository.
- [ ] Access to Vercel, Supabase, Cloudflare/Namecheap, and the Git host protected with two-factor authentication.
- [ ] Logs contain no secrets or personal content beyond user ids and emails where needed.

## 8. Privacy and compliance notes

- The system stores names, work emails, IPs, and user agents (sessions, audit). Mention this to staff.
- Audit logs are kept indefinitely; sessions and login attempts for 30 days.
- Deleting a user removes their profile; their authored content stays attributed to "Deleted user".

## 9. Pre-launch security test script

1. Try every admin endpoint as a member. Expect 403.
2. Request a page from a restricted space as a non-member. Expect 404.
3. Sign in on two browsers. Terminate one from admin. The terminated one must fail on its next click.
4. Wait 31 minutes idle. Next request must be 401.
5. Enter a wrong password 5 times. The 6th attempt (even with the right password) must fail for 15 minutes.
6. Upload `test.svg` and a 26 MB file. Both rejected.
7. Paste `<script>alert(1)</script>` into title, description, comment, and a code block. Nothing executes anywhere.
8. Send a state-changing request without `X-CSRF-Token`. Expect 403.
9. Try to read `https://api.example.com/api/v1/pages/<id>` from another origin with `fetch`. CORS must block it.
10. Confirm the Supabase anon key cannot read any table (it should not even be present in the frontend).
