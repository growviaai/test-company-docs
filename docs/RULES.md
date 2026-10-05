# RULES — hard rules for the AI builder

These rules apply to **every** task. If a request or another file conflicts with a rule here, follow this file and tell the owner.

## 1. Scope and honesty

1. Build **only** what the spec files describe. Do not add features, screens, endpoints, or libraries that are not specified. If you think something is missing, **ask the owner** and wait.
2. When the spec is unclear or two files disagree, **stop and ask**. Never guess on security, permissions, or data deletion.
3. Do not claim something works unless you ran it. Report what you ran and what the result was. If you could not test something, say so.
4. Mark deliberate assumptions in code comments as `// ASSUMPTION:` and list them in your report.
5. Do not change the locked stack (`00-README-for-AI.md`) without the owner's written approval.

## 2. Security rules (never break)

1. **No public sign-up.** No sign-up route, page, or button. Accounts come only from invites or the first-admin script.
2. The **service role key and SMTP password never reach the browser** and never appear in the repo, logs, or error messages.
3. The frontend **never calls Supabase directly** and has no Supabase keys. Everything goes through the API.
4. **Every API route** checks the session and permission through the shared helpers. A route without a check is a bug.
5. Auth uses **only** our `sessions` table and the `sid` cookie. Never store tokens in `localStorage` or `sessionStorage`.
6. Sessions: 30 minutes idle, 12 hours absolute, checked **server-side** on every request. Admin termination must work immediately.
7. Never render user content as raw HTML. No `dangerouslySetInnerHTML` except the vetted search-snippet renderer.
8. Validate **all** input with zod (shared schemas). Reject unknown fields.
9. Use the Supabase client with parameters. **Never build SQL from strings.**
10. Never log passwords, tokens, cookies, reset or invite links, or page content.
11. Error messages for sign-in, forgot-password, and invites must be generic (no account enumeration).
12. Uploads follow `07-docs-editor.md` exactly (type allowlist, 25 MB, magic-number check, private bucket, 60-second signed URLs). No SVG.
13. Hide inaccessible spaces with `404`, not `403`.
14. Do not weaken CORS, CSRF, cookie flags, or CSP to "make it work". Fix the cause instead.

## 3. Code rules

1. **TypeScript strict** everywhere. No `any`, no `@ts-ignore` without a comment explaining why and an owner-approved reason.
2. Share types and zod schemas through `packages/shared`. Do not duplicate them.
3. Folder structure exactly as in `02-architecture.md`. Feature code lives in `features/<name>`; reusable UI in `components/ui`.
4. API handlers stay thin: parse, authorize, call a service, respond. Business logic lives in `services/`.
5. One Hono app, one Vercel function. Do not create many small functions.
6. Database changes only through numbered migration files. Never edit an applied migration; add a new one.
7. Constants (timeouts, limits) live in `packages/shared/constants.ts`. No magic numbers.
8. Keep functions small and named by what they do. Prefer clear code over clever code. Comment the **why**, not the what.
9. Handle errors explicitly. Return the standard error shape from `10-api-spec.md`.
10. Dependencies: use well-known maintained packages, pin exact versions, and justify each new one in the report. Run `pnpm audit` before finishing a phase.
11. No dead code, no commented-out blocks, no leftover `console.log`.

## 4. UI rules

1. Follow `11-design-system.md` and the files in `design/`. **Use tokens, never hardcoded hex values** in components.
2. Every screen works in **light and dark** mode and from 360 px wide up.
3. Use the shared UI components. Do not restyle the same element twice in different places.
4. Every list or fetch has loading, empty, and error states. Errors offer a retry.
5. Keyboard accessible: visible focus, labelled icon buttons, Escape closes dialogs and menus, focus trapped in dialogs.
6. Destructive actions need a confirm dialog that names the item. Deleting a user also requires typing their email.
7. All user-visible strings go through `lib/strings.ts` (English only in v1).
8. Do not use GitBook's name, logo, or icons as branding.

## 5. Data rules

1. Pages are **soft-deleted**. Only admins purge.
2. Versions and audit logs are never edited. `audit_logs` is append-only.
3. Never delete or demote the **last active admin**. Never let an admin deactivate or delete themselves.
4. Optimistic locking with `revision` on page saves. Never silently overwrite another person's change.
5. Every admin or security action writes an audit entry in the same request.

## 6. Git rules

1. Work on a branch `feat/<name>` or `fix/<name>`; never commit directly to `main`.
2. Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
3. Small, focused commits. Each phase ends with a clean, passing build.
4. Never commit `.env` files, keys, or credentials. If a secret is committed, tell the owner immediately so it can be rotated.
5. Keep `.env.example` in sync with every variable the code reads.

## 7. Testing rules

1. Every permission row in `05-roles-permissions.md` has a test.
2. Auth tests: success, wrong password, lockout, idle expiry, revoked session, deactivated user, invite expiry, reuse of a token.
3. Add a regression test with every bug fix.
4. A phase is not done until `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass.

## 8. Communication rules

1. After each phase, send a report in the format given in `MASTER_PROMPT.md` and **wait for the owner's go-ahead** before the next phase.
2. Ask questions in a short numbered list, one decision per question, with your recommended answer.
3. Plain language. Define technical terms the first time you use them.
4. Never hide a problem. If something is broken, risky, or skipped, say so first.

## 9. Things you must never do

- Add sign-up, social login, or public pages.
- Expose the Supabase anon or service key to the browser.
- Skip or "temporarily" disable a security control.
- Use `*` as the CORS origin or send credentials to other origins.
- Put secrets in `VITE_` variables.
- Store passwords, or log them, anywhere outside Supabase Auth.
- Delete data permanently without an explicit admin action and an audit entry.
- Change the specs silently. Propose the change and wait for approval.
