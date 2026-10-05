# 14 — Build plan (phases and checklists)

Work in order. Finish and verify each phase before starting the next. After each phase: run tests, commit, and report to the owner using the format in `MASTER_PROMPT.md`.

## Phase 0 — Repository and tooling
- [ ] Create the monorepo from `02-architecture.md` (pnpm workspaces, TypeScript strict, ESLint, Prettier).
- [ ] `apps/web` (Vite React TS Tailwind), `apps/api` (Hono), `packages/shared`.
- [ ] `.env.example` files, `.gitignore`, CI workflow, README with local setup.
- **Done when:** `pnpm install`, `pnpm build`, `pnpm test`, and `pnpm lint` all pass on a clean clone.

## Phase 1 — Database
- [ ] Write migrations from `03-database-schema.md` (enums, tables, indexes, triggers, `search_pages`).
- [ ] RLS enabled on every table, no policies, grants revoked.
- [ ] Storage bucket created (private).
- [ ] `scripts/create-first-admin.ts`.
- **Done when:** migrations apply to a fresh dev project and the first admin exists.

## Phase 2 — API core and authentication
- [ ] Hono app, env validation, error handler, request id, CORS, security headers.
- [ ] Session service, session middleware (idle, absolute, revoked, deactivated), CSRF middleware.
- [ ] Rate limiting backed by Postgres.
- [ ] Sign-in with lockout, sign-out, `GET /me`, change password, my sessions.
- [ ] Forgot and reset password. Email service (nodemailer, outbox, templates).
- [ ] Audit service.
- **Done when:** the auth tests in `04-auth-and-sessions.md` pass, including lockout and idle expiry.

## Phase 3 — Admin API
- [ ] Invites: create, resend, revoke, accept.
- [ ] Users: list, role change, deactivate, reactivate, delete, send reset, last-admin guard.
- [ ] Admin sessions: list, terminate one, terminate all.
- [ ] Audit log listing and CSV export.
- **Done when:** all admin endpoints in `10-api-spec.md` work and are covered by permission tests.

## Phase 4 — Frontend shell and design system
- [ ] Tokens, Tailwind mapping, light/dark theme with toggle and no flash.
- [ ] UI components from `11-design-system.md`.
- [ ] API client (`credentials: include`, CSRF header, 401 handling), auth provider, route guards.
- [ ] Screens: sign-in, accept invite, forgot and reset password, app shell (sidebar, header), 404, 403.
- [ ] Idle warning dialog and auto sign-out.
- **Done when:** an invited user can accept, sign in, see an empty app shell, and be signed out after idle.

## Phase 5 — Admin UI
- [ ] Users, Invites, Sessions screens with all actions and confirm dialogs.
- [ ] Settings → Security (change password, my sessions) and Profile.
- **Done when:** the acceptance criteria in `06-admin-panel.md` pass.

## Phase 6 — Spaces and page tree
- [ ] Spaces API and admin Spaces screen (visibility, members, archive, order).
- [ ] Pages API: tree, create, rename, move, reorder, duplicate, soft delete.
- [ ] Sidebar tree with groups, drag and drop, context menu, "Find pages…".
- [ ] Space access rule applied everywhere (`05-roles-permissions.md`).
- **Done when:** restricted-space access tests pass and the tree works with keyboard and mouse.

## Phase 7 — Editor
- [ ] TipTap setup, schema, all v1 blocks, slash menu, floating toolbar, placeholders.
- [ ] Autosave, revision conflict dialog, server-side content validation, `content_text` generation.
- [ ] Reader view with outline, breadcrumbs, last modified, previous/next.
- **Done when:** content round-trips (save, reload, identical) for every block type.

## Phase 8 — Uploads
- [ ] Sign, upload, complete, magic-number check, signed download URLs.
- [ ] Image node and file node, drag-and-drop and paste, progress, errors.
- **Done when:** the upload tests in `12-security.md` pass.

## Phase 9 — Versions and Trash
- [ ] Version creation rules, history panel, preview, restore with permission rule.
- [ ] Trash list, restore, permanent delete, 90-day purge job.
- **Done when:** restore creates a new version and never loses data.

## Phase 10 — Comments and notifications
- [ ] Comments API and UI with replies, edit, delete, mentions picker.
- [ ] Notifications API and UI (bell, dropdown, page), unread polling.
- [ ] Email notifications and retry via outbox.
- **Done when:** the acceptance criteria in `08-comments-notifications.md` pass.

## Phase 11 — Search
- [ ] `search_pages` integration, access filtering, snippet sanitizing.
- [ ] `Ctrl/Cmd + K` dialog and `/search` page.
- **Done when:** search never returns pages from spaces the user cannot access.

## Phase 12 — Audit UI and hardening
- [ ] Audit log screen with filters, drawer, CSV export.
- [ ] Complete every checklist item in `12-security.md`, run the pre-launch script.
- [ ] Accessibility pass (keyboard, focus, contrast, screen reader labels).
- [ ] Performance pass (bundle size, lazy-load editor, query caching).

## Phase 13 — Deployment
- [ ] Create Supabase production project and apply migrations.
- [ ] Deploy API to Vercel with the custom API domain.
- [ ] Deploy frontend to Cloudflare Pages or Namecheap per `13-deployment-git.md`.
- [ ] DNS, HTTPS, SPF/DKIM, environment variables.
- [ ] Create the first admin in production. Smoke test. Tag `v1.0.0`.

## Definition of done (for every task)

1. It matches the spec files. If the spec is unclear, the AI asked the owner.
2. Types are strict with no `any`. Lint and format pass.
3. Tests exist for new logic and permissions.
4. No secrets, no `console.log` of sensitive data.
5. UI follows the design tokens in both themes and is keyboard accessible.
6. The change is committed with a Conventional Commit message.
