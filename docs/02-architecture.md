# 02 — Architecture

## 1. Overview

```
Browser (React SPA)
   │  HTTPS, cookie session, JSON
   ▼
API on Vercel  (one Hono app, TypeScript)  ── SMTP ──► Company mail server
   │  service-role key (server only)
   ▼
Supabase: Postgres + Storage (+ Auth for password checks)
```

- The **frontend never talks to Supabase directly.** It only calls our API. No `supabase-js` in the frontend, no Supabase keys in the browser.
- The **API is the only place authorization happens.** It uses the Supabase **service role key**, so row-level security is a second safety net, not the main one (see `03-database-schema.md`).
- Sessions are **our own**, stored in the `sessions` table (not Supabase's JWT sessions). That is what makes "terminate session" and the 30-minute idle rule instant. See `04-auth-and-sessions.md`.

## 2. Repository layout (monorepo, pnpm workspaces)

```
/
├─ apps/
│  ├─ web/                  React + Vite + Tailwind SPA
│  │  ├─ src/
│  │  │  ├─ app/            router, providers, layout shell
│  │  │  ├─ features/       auth, admin, spaces, pages, editor, comments, search, notifications, settings
│  │  │  ├─ components/ui/  design-system components (button, input, badge, menu, dialog…)
│  │  │  ├─ lib/            api client, query client, theme, strings
│  │  │  └─ styles/         tokens.css, tailwind.css
│  │  └─ public/            _redirects, _headers, .htaccess templates
│  └─ api/                  Hono app for Vercel
│     ├─ api/index.ts       Vercel entry (one function)
│     ├─ src/
│     │  ├─ routes/         auth, me, admin, spaces, pages, versions, comments, notifications, search, uploads
│     │  ├─ middleware/     session, csrf, cors, rateLimit, errorHandler, requestId
│     │  ├─ services/       sessions, invites, email, audit, permissions, search, storage
│     │  ├─ db/             supabase client, typed queries
│     │  └─ config/         env validation (zod)
│     └─ vercel.json
├─ packages/
│  └─ shared/               zod schemas, TypeScript types, permission helpers, constants
├─ supabase/
│  └─ migrations/           SQL files, numbered
├─ scripts/
│  └─ create-first-admin.ts
├─ docs/                    these markdown files
├─ .github/workflows/       CI
└─ pnpm-workspace.yaml
```

## 3. Technology choices

Use the latest stable versions at build time and pin exact versions in `package.json`.

| Concern | Library |
|---|---|
| Frontend framework | React 18+, TypeScript (strict), Vite |
| Styling | Tailwind CSS using CSS variables for tokens (`11-design-system.md`) |
| Routing | React Router |
| Server state | TanStack Query |
| Editor | TipTap (ProseMirror) with custom nodes |
| Forms | React Hook Form + zod resolver |
| Drag and drop | dnd-kit (page tree reorder) |
| Icons | Lucide or Tabler outline icons |
| Fonts | `@fontsource-variable/inter`, `@fontsource/ibm-plex-mono` (self-hosted) |
| API framework | Hono (Vercel Node runtime) |
| Validation | zod, shared through `packages/shared` |
| Database client | `@supabase/supabase-js` with service role, server only |
| Email | nodemailer over SMTP |
| Tests | Vitest (unit), Playwright (end-to-end smoke) |
| Lint and format | ESLint, Prettier, TypeScript strict |

## 4. Why one Hono function

Vercel limits the number of serverless functions on lower plans, and many small functions slow cold starts and duplicate code. One function with an internal router keeps deploys simple. `vercel.json` rewrites `/api/(.*)` to the single entry.

## 5. Domains and cookies (important)

The frontend and API are hosted by different companies, so the **cookie must work across them**. This only works if both share the same registrable domain.

| Service | Example hostname |
|---|---|
| Frontend (Cloudflare Pages or Namecheap) | `docs.example.com` |
| API (Vercel, custom domain) | `api.example.com` |

- Session cookie: `Domain=.example.com`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- API CORS: allow **only** the exact frontend origin, with `credentials: true`.
- Frontend fetch always uses `credentials: "include"`.
- **Do not** use the default `*.vercel.app` URL in production, because the cookie would be third-party and blocked by browsers.
- CSRF token required on every state-changing request (`04-auth-and-sessions.md`).

## 6. Request lifecycle

1. Request hits Hono. Middleware order: `requestId` → `cors` → `rateLimit` → `session` → `csrf` → route → `errorHandler`.
2. `session` hashes the cookie token, loads the session row, checks `revoked_at`, `expires_at`, and 30-minute idle, checks the user is `active`, then bumps `last_active_at` (at most once per minute).
3. Route handlers call **permission helpers** from `services/permissions.ts` before touching data.
4. Handlers validate input with zod and return the standard JSON shapes in `10-api-spec.md`.
5. Sensitive actions write an `audit_logs` row.

## 7. Email

- Sent from the API through SMTP with `nodemailer`. Use `waitUntil` so the HTTP response does not wait for the mail server.
- Every send is recorded in `email_outbox` with status. Failures are visible to admins and can be retried.
- Templates are plain HTML plus a text version, styled with inline CSS. Never put passwords in an email.

## 8. File storage

- Private Supabase Storage bucket `attachments`.
- Upload flow is **direct from browser to Supabase using a signed upload URL** (Vercel functions cannot accept 25 MB request bodies). Details in `07-docs-editor.md`.
- Downloads: API checks permission, then returns a signed URL that lives 60 seconds.

## 9. Environments

| Env | Frontend | API | Supabase project |
|---|---|---|---|
| Local | `http://localhost:5173` | `http://localhost:3001` (local Node server wrapping the same Hono app) | A separate dev project |
| Production | `https://docs.example.com` | `https://api.example.com` | Production project |

Never share a Supabase project between dev and production. Config details: `13-deployment-git.md`.

## 10. Error and log conventions

- Every response includes the header `X-Request-Id`.
- Errors use one JSON shape (see `10-api-spec.md`).
- Logs are JSON lines. **Never log passwords, tokens, cookies, or full request bodies.**
