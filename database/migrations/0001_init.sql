create extension if not exists citext;
create extension if not exists pgcrypto;

create type user_role        as enum ('admin', 'member');
create type user_status      as enum ('active', 'deactivated');
create type space_visibility as enum ('all', 'restricted');
create type page_kind        as enum ('page', 'group');
create type version_reason   as enum ('autosave', 'manual', 'restore', 'delete');
create type notification_type as enum ('mention', 'reply');
create type email_status     as enum ('queued', 'sent', 'failed');
create type attachment_status as enum ('pending', 'ready');

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

create table invites (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  role user_role not null default 'member',
  token_hash text not null unique,
  space_ids uuid[] not null default '{}',
  invited_by uuid not null references profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invites_one_open_per_email
  on invites (email) where accepted_at is null and revoked_at is null;

create table password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  csrf_token text not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references profiles(id),
  revoked_reason text
);
create index sessions_user_active on sessions (user_id) where revoked_at is null;

create table login_attempts (
  id bigserial primary key,
  email citext,
  ip inet,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_email_time on login_attempts (email, created_at desc);
create index login_attempts_ip_time on login_attempts (ip, created_at desc);

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

create table space_members (
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  added_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

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
  content jsonb not null default '{"type":"doc","content":[]}',
  content_text text not null default '',
  search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(content_text,'')), 'C')
  ) stored,
  revision int not null default 1,
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

create table comments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
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

create table attachments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  page_id uuid references pages(id) on delete set null,
  uploaded_by uuid not null references profiles(id),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  status attachment_status not null default 'pending',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email citext not null,
  subject text not null,
  html text not null,
  text text not null,
  kind text not null,
  status email_status not null default 'queued',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table audit_logs (
  id bigserial primary key,
  actor_id uuid references profiles(id) on delete set null,
  actor_email citext,
  action text not null,
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

alter table profiles enable row level security;
alter table invites enable row level security;
alter table password_resets enable row level security;
alter table sessions enable row level security;
alter table login_attempts enable row level security;
alter table spaces enable row level security;
alter table space_members enable row level security;
alter table pages enable row level security;
alter table page_versions enable row level security;
alter table comments enable row level security;
alter table comment_mentions enable row level security;
alter table notifications enable row level security;
alter table attachments enable row level security;
alter table email_outbox enable row level security;
alter table audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;

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

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger spaces_updated_at before update on spaces for each row execute function set_updated_at();
create trigger pages_updated_at before update on pages for each row execute function set_updated_at();
