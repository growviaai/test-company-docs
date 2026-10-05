# 13 — Deployment, environments, and Git

## 1. Hosting decisions

| Part | Choice | Status |
|---|---|---|
| Backend | Vercel (one Hono function) | Decided |
| Database and storage | Supabase | Decided |
| Frontend | **Cloudflare Pages (recommended)** or **Namecheap** | **Owner has not finalized**: build so both work |
| Source control | Git | Decided |

### Frontend: Cloudflare Pages vs Namecheap

| | Cloudflare Pages | Namecheap shared hosting |
|---|---|---|
| Deploy | Automatic from Git on every push | Manual upload (FTP/cPanel) or a GitHub Actions FTP job |
| SPA routing (`/s/hr/leave`) | Built in with a `_redirects` file | Needs `.htaccess` rewrite |
| Security headers | `_headers` file | `.htaccess` `Header set …` |
| HTTPS | Automatic | AutoSSL / Let's Encrypt in cPanel |
| Preview deploys per branch | Yes | No |
| Cost | Free tier available | Included in your plan |

Default recommendation: **Cloudflare Pages**, because deploys are automatic and safer. Namecheap works fine as a static file host if you prefer to keep everything there. Verify current plan limits in each provider's dashboard before launch.

The **API must be on a subdomain of the same root domain** as the frontend (see `02-architecture.md` section 5). Example: `docs.example.com` (frontend) and `api.example.com` (Vercel).

## 2. Git

- One repository (monorepo, see `02-architecture.md`). Private repo.
- Branches: `main` (production, protected), `develop` (optional integration), `feat/<short-name>`, `fix/<short-name>`.
- Protect `main`: pull request required, CI must pass, no force push.
- Commit messages: Conventional Commits (`feat: add invite expiry`, `fix: block last admin demotion`).
- `.gitignore` must include: `node_modules`, `dist`, `.env*`, `.vercel`, `.DS_Store`, coverage output.
- Never commit secrets. If one leaks, rotate it immediately.

## 3. Environment variables

### API (Vercel project settings → Environment Variables)

| Name | Example / meaning |
|---|---|
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | `https://docs.example.com` (exact, no trailing slash) |
| `COOKIE_DOMAIN` | `.example.com` |
| `COOKIE_SECURE` | `true` (`false` only locally) |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server only |
| `SUPABASE_ANON_KEY` | Only for the server-side password check |
| `SUPABASE_STORAGE_BUCKET` | `attachments` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | From your mail provider |
| `COMPANY_NAME` | Used in emails |
| `APP_BASE_URL` | Same as `FRONTEND_ORIGIN`, used for links in emails |

The API validates all variables with zod at startup and fails fast with a clear message if any is missing.

### Frontend (build-time, public)

| Name | Meaning |
|---|---|
| `VITE_API_BASE_URL` | `https://api.example.com/api/v1` |
| `VITE_COMPANY_NAME` | Header text |
| `VITE_SUPABASE_URL` | Only if needed for CSP docs; **no keys** |

**Nothing secret may start with `VITE_`.** Everything with that prefix ends up in the browser.

Provide `.env.example` files in `apps/web` and `apps/api` with every name and no values.

## 4. Local development

```
pnpm install
pnpm --filter api dev       # API on http://localhost:3001
pnpm --filter web dev       # Web on http://localhost:5173
```
- `COOKIE_SECURE=false`, `COOKIE_DOMAIN` unset, `FRONTEND_ORIGIN=http://localhost:5173`.
- Use a **separate dev Supabase project**. Apply migrations with the Supabase CLI: `supabase db push`.
- Run `pnpm tsx scripts/create-first-admin.ts` once.
- Test emails: point SMTP to a dev inbox (for example Mailpit locally) or use real SMTP with your own address.

## 5. Deploying the API on Vercel

1. Create a Vercel project from the Git repo. Set **Root Directory** to `apps/api` and enable "Include source files outside of the Root Directory" so `packages/shared` is available.
2. Framework preset: Other. Build command builds shared then the API.
3. Add the environment variables above (Production, plus Preview with dev values).
4. Add custom domain `api.example.com` and create the DNS record Vercel shows (at Namecheap or Cloudflare DNS).
5. `apps/api/vercel.json`:
```json
{
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api" }],
  "headers": [
    { "source": "/api/(.*)", "headers": [{ "key": "Cache-Control", "value": "no-store" }] }
  ]
}
```
6. Check `GET https://api.example.com/api/v1/health`.

Plan note: Vercel's free Hobby plan is intended for non-commercial use and has function and cron limits. A company site should use a paid plan; **check Vercel's current terms and limits** before launch.

## 6. Deploying the frontend

### Cloudflare Pages
1. Connect the Git repo. Build command `pnpm --filter web build`. Output directory `apps/web/dist`. Set `VITE_*` variables.
2. Custom domain `docs.example.com`.
3. Add `apps/web/public/_redirects`:
```
/*  /index.html  200
```
4. Add `apps/web/public/_headers` with the CSP and other headers from `12-security.md`.

### Namecheap
1. Build locally or in CI: `pnpm --filter web build`.
2. Upload the contents of `apps/web/dist` to the site's `public_html` (or the subdomain folder).
3. Add `.htaccess` in that folder:
```
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ /index.html [L]

Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
Header set Content-Security-Policy "<same policy as in 12-security.md>"
```
4. Optional: a GitHub Actions job that builds and uploads via FTPS to automate this.

## 7. Supabase setup checklist

- [ ] Create production and dev projects.
- [ ] Apply all migrations. Confirm RLS is on for every table.
- [ ] Create private storage bucket `attachments`.
- [ ] Disable public sign-ups; set minimum password length 12.
- [ ] Note project URL and keys; store the service role key only in Vercel.
- [ ] Confirm backups and the project pause rules for your plan (free projects can pause when inactive; a company site needs a plan that stays on).

## 8. CI (GitHub Actions or equivalent) on every pull request

1. Install with a frozen lockfile.
2. Typecheck, lint, format check.
3. Unit and integration tests (Vitest).
4. Build web and API.
5. `pnpm audit --prod` (fail on high severity).
Optional: Playwright smoke test against a preview deployment.

## 9. Release process

1. PR into `main`, CI green, one review.
2. Merge. Vercel and Cloudflare Pages deploy automatically (Namecheap: run the upload).
3. Run database migrations **before** deploying code that needs them. Migrations must be backward compatible with the previous code for one release.
4. Smoke test: sign in, open a page, search, post a comment, open admin users.
5. Tag releases `vMAJOR.MINOR.PATCH`.

## 10. Rollback

- Vercel: promote the previous deployment.
- Cloudflare Pages: roll back to a previous deployment in the dashboard.
- Namecheap: keep the previous `dist` as a zip and re-upload.
- Database: write forward fixes; do not rely on down migrations.

## 11. Monitoring

- Vercel function logs for API errors.
- An uptime check on `/api/v1/health` and the frontend URL.
- Alert on repeated `auth.account_locked` events and failed emails (visible in admin).
