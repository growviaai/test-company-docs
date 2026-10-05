# 00 — README for the AI builder

You are building a **private company documentation website**. It looks and feels like GitBook, but it is a custom app. Read this file first, then follow the reading order below.

## What this product is

- A private docs site for one company. **No public sign-up. Sign-in only.**
- Two roles: **Admin** and **Member**.
- People join only by **email invite**.
- Docs live in **Spaces**, which contain nested **Pages** and **Groups**. Docs are written in an in-app editor and stored in Supabase.
- Extra v1 features: full-text search, page version history with restore, comments with replies and @mentions, in-app and email notifications, and an admin audit log.

## Locked stack (do not change without asking)

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS, static build |
| Frontend hosting | **Cloudflare Pages (recommended) or Namecheap** (not final; see `13-deployment-git.md`) |
| Backend | Vercel serverless function running one Hono app (TypeScript) |
| Database and file storage | Supabase (Postgres + Storage) |
| Credential check | Supabase Auth, called only from the backend |
| Email | The company's own SMTP (Namecheap Private Email or similar) |
| Version control | Git, monorepo |

## Reading order

| # | File | Read it to learn |
|---|---|---|
| 0 | `MASTER_PROMPT.md` | How to run this build, phase by phase |
| 1 | `RULES.md` | Hard rules you must obey at all times |
| 2 | `01-product-requirements.md` | What to build, in detail |
| 3 | `02-architecture.md` | How the parts fit together |
| 4 | `03-database-schema.md` | Tables, enums, indexes, row-level security |
| 5 | `04-auth-and-sessions.md` | Invites, sign-in, lockout, idle timeout, session termination |
| 6 | `05-roles-permissions.md` | Who can do what |
| 7 | `06-admin-panel.md` | Admin screens |
| 8 | `07-docs-editor.md` | Spaces, pages, editor, uploads |
| 9 | `08-comments-notifications.md` | Comments, mentions, notifications, email |
| 10 | `09-search-versions-audit.md` | Search, version history, audit log |
| 11 | `10-api-spec.md` | Every endpoint |
| 12 | `11-design-system.md` and `design/*.md` | Colors, fonts, spacing, components |
| 12b | `reference-images/` | Real GitBook screenshots, dark and light (compare your UI to them) |
| 13 | `12-security.md` | Security requirements and checklist |
| 14 | `13-deployment-git.md` | Environments, domains, CI, deploy |
| 15 | `14-build-plan.md` | Ordered phases with checklists |

## Source of truth

If two files disagree, use this priority: `RULES.md` > `01-product-requirements.md` > the specific topic file > `14-build-plan.md`. If still unclear, **stop and ask the owner**. Do not guess on security or permissions.

## Things the owner decided

- Roles: Admin and Member only.
- Sign-in: email and password, minimum 12 characters, 15-minute lockout after 5 failed attempts.
- Sessions auto-expire after **30 minutes of inactivity**.
- Admins can: invite by email with an expiry, terminate one or all sessions of a user, deactivate or delete users, change roles.
- Admins and Members can both create and edit docs. Only the page **author and admins** can delete pages and restore versions.
- Admins can limit a space to chosen members. Otherwise every signed-in member sees it.
- Editor blocks: headings, lists, code, images, tables, hints (plus file attachments, since uploads are allowed).
- Uploads: images, PDFs and files, up to 25 MB each.
- Comments with replies and @mentions. Notifications in-app and by email.
- UI language: English only. Look: GitBook-style, light and dark with a toggle.

## Assumptions the AI added (the owner may change these)

These were not explicitly requested. They are normal for this kind of product and are marked `[ASSUMPTION]` in the other files.

1. "Forgot password" by emailed one-time link (expires in 1 hour), plus an admin button to send a reset link.
2. A user can change their own password and see or end their own sessions.
3. Absolute session lifetime of 12 hours, even if the user stays active.
4. Invite expiry options: 24 hours, 72 hours (default), 7 days.
5. Soft delete for pages, with an admin Trash view.
6. No real-time co-editing in v1. Conflicts are detected and shown.
7. Task lists are included under "lists".
