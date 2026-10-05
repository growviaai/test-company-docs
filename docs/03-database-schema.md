# 03 — Database schema (Supabase Postgres)

All SQL goes in numbered files under `supabase/migrations/`. Never edit the database by hand in production.

## 1. Setup

```sql
create extension if not exists citext;
create extension if not exists pgcrypto;
```

In the Supabase dashboard (Auth settings):
- **Disable "Allow new users to sign up".**
- Set minimum password length to 12.
- Turn off email confirmation emails and magic links; we send our own emails.
- We only call Supabase Auth from the API with the service role key.

## 2. Enums

```sql
create type user_role        as enum ('admin', 'member');
create type user_status      as enum ('active', 'deactivated');
create type space_visibility as enum ('all', 'restricted');
create type page_kind        as enum ('page', 'group');
create type version_reason   as enum ('autosave', 'manual', 'restore', 'delete');
create type notification_type as enum ('mention', 'reply');
create type email_status     as enum ('queued', 'sent', 'failed');
create type attachment_status as enum ('pending', 'ready');
```

## 3. Tables

### profiles
One row per person. `id` equals the Supabase Auth user id.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role user_role not null default 'member',
  status user_status not null default 'active',
  email_notifications boolean not null default true,
  failed_login_count int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### invites
```sql
create table invites (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  role user_role not null default 'member',
  token_hash text not null unique,          -- SHA-256 hex of the raw token
  space_ids uuid[] not null default '{}',   -- spaces to grant on acceptance
  invited_by uuid not null references profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invites_one_open_per_email
  on invites (email) where accepted_at is null and revoked_at is null;
```

### password_resets
```sql
create table password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,       -- 1 hour
  used_at timestamptz,
  created_at timestamptz not null default now()
);
```

### sessions
```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,          -- SHA-256 hex of the cookie token
  csrf_token text not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  expires_at timestamptz not null,          -- absolute limit (created_at + 12h)
  revoked_at timestamptz,
  revoked_by uuid references profiles(id),
  revoked_reason text                       -- 'logout' | 'idle' | 'admin' | 'password_change' | 'deactivated'
);
create index sessions_user_active on sessions (user_id) where revoked_at is null;
```

### login_attempts
Used for rate limiting and audit of failures.
```sql
create table login_attempts (
  id bigserial primary key,
  email citext,
  ip inet,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_email_time on login_attempts (email, created_at desc);
create index login_attempts_ip_time on login_attempts (ip, created_at desc);
```

### spaces
```sql
create table spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  emoji text,
  visibility space_visibility not null default 'all',
  position int not null default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

### space_members
Only used when `visibility = 'restricted'`. Admins always have access.
```sql
create table space_members (
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  added_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
```

### pages
Pages and groups share one table.
```sql
create table pages (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  parent_id uuid references pages(id) on delete cascade,
  kind page_kind not null default 'page',
  title text not null default 'Untitled' check (char_length(title) <= 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 300),
  emoji text,
  position int not null default 0,
  content jsonb not null default '{"type":"doc","content":[]}',   -- TipTap JSON
  content_text text not null default '',                          -- plain text for search, filled by the API
  search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(content_text,'')), 'C')
  ) stored,
  revision int not null default 1,               -- optimistic locking
  created_by uuid not null references profiles(id),
  updated_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references profiles(id)
);
create unique index pages_slug_unique
  on pages (space_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
  where deleted_at is null;
create index pages_tree on pages (space_id, parent_id, position) where deleted_at is null;
create index pages_search on pages using gin (search_tsv);
```

### page_versions
```sql
create table page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  version_no int not null,
  title text not null,
  description text,
  content jsonb not null,
  reason version_reason not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (page_id, version_no)
);
create index page_versions_page on page_versions (page_id, version_no desc);
```

### comments
```sql
create table comments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,   -- null = top-level; replies only one level deep
  author_id uuid not null references profiles(id),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index comments_page on comments (page_id, created_at);

create table comment_mentions (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);
```
Comment body is plain text. A mention is stored in the text as `@[Full Name](user:<uuid>)` and also in `comment_mentions`. The API parses and validates mentions (the mentioned user must have access to the space).

### notifications
```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  actor_id uuid not null references profiles(id),
  page_id uuid not null references pages(id) on delete cascade,
  comment_id uuid not null references comments(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread on notifications (user_id, created_at desc) where read_at is null;
```

### attachments
```sql
create table attachments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  page_id uuid references pages(id) on delete set null,
  uploaded_by uuid not null references profiles(id),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400),   -- 25 MB
  status attachment_status not null default 'pending',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

### email_outbox
```sql
create table email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email citext not null,
  subject text not null,
  html text not null,
  text text not null,
  kind text not null,                -- 'invite' | 'reset' | 'mention' | 'reply'
  status email_status not null default 'queued',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
```

### audit_logs (append-only)
```sql
create table audit_logs (
  id bigserial primary key,
  actor_id uuid references profiles(id) on delete set null,
  actor_email citext,                 -- copied, so the record survives user deletion
  action text not null,               -- see 09-search-versions-audit.md
  target_type text,
  target_id text,
  metadata jsonb not null default '{}',
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_time on audit_logs (created_at desc);
create index audit_logs_actor on audit_logs (actor_id, created_at desc);
create index audit_logs_action on audit_logs (action, created_at desc);

create or replace function audit_logs_block_changes() returns trigger as $$
begin raise exception 'audit_logs is append-only'; end;
$$ language plpgsql;
create trigger audit_logs_no_update before update or delete on audit_logs
  for each row execute function audit_logs_block_changes();
```

## 4. Row-level security

Turn RLS **on for every table** and create **no policies**. With no policies, the anon and authenticated roles can read nothing. Only the API's service role key can access data.

```sql
alter table profiles enable row level security;
-- repeat for: invites, password_resets, sessions, login_attempts, spaces, space_members,
-- pages, page_versions, comments, comment_mentions, notifications, attachments,
-- email_outbox, audit_logs
```

Also: `revoke all on all tables in schema public from anon, authenticated;`

## 5. Storage

- Bucket `attachments`, **private** (not public).
- Path format: `<space_id>/<attachment_id>/<sanitized_file_name>`.
- No storage policies for anon or authenticated. Only the service role creates signed URLs.

## 6. Search function

```sql
create or replace function search_pages(q text, accessible_space_ids uuid[], lim int default 20)
returns table (
  page_id uuid, space_id uuid, title text, slug text, parent_id uuid,
  snippet text, rank real
) language sql stable as $$
  select p.id, p.space_id, p.title, p.slug, p.parent_id,
         ts_headline('english', p.content_text, websearch_to_tsquery('english', q),
                     'MaxFragments=2, MaxWords=24, MinWords=8, StartSel=<mark>, StopSel=</mark>') as snippet,
         ts_rank(p.search_tsv, websearch_to_tsquery('english', q)) as rank
  from pages p
  where p.deleted_at is null
    and p.kind = 'page'
    and p.space_id = any(accessible_space_ids)
    and p.search_tsv @@ websearch_to_tsquery('english', q)
  order by rank desc
  limit lim;
$$;
```
The API computes `accessible_space_ids` from the permission rules and passes it in. The API must escape `<` and `>` in the snippet except the `<mark>` tags before sending it to the browser.

## 7. Triggers

- `updated_at` auto-update trigger on `profiles`, `spaces`, `pages`.
- A trigger or API rule to keep `page_versions.version_no` sequential per page.

## 8. Seed and first admin

`scripts/create-first-admin.ts` (run locally, with the service role key in the environment):
1. Ask for email, full name, and a password (minimum 12 characters).
2. Create the user in Supabase Auth with `email_confirm: true`.
3. Insert the `profiles` row with `role = 'admin'`.
4. Write an `audit_logs` row `system.first_admin_created`.
It refuses to run if an admin already exists.

## 9. Retention

- `sessions`: delete rows older than 30 days after revoke or expiry.
- `login_attempts`: delete after 30 days.
- `audit_logs`: keep forever.
- `page_versions`: keep forever in v1.
