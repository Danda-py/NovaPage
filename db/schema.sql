-- NovaPage · schema Postgres (Neon)
-- Applica con: node --env-file=.env.local scripts/schema.mjs
-- Su un database già esistente usa: node --env-file=.env.local scripts/migrate-v2.mjs

create table if not exists users (
  id              text primary key,
  email           text unique not null,
  password_hash   text not null,
  salt            text not null,
  session_version   int not null default 0,
  terms_accepted_at timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists sites (
  id         text primary key,
  owner_id   text references users(id) on delete cascade,
  slug       text unique not null,
  config     jsonb not null default '{}'::jsonb,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `create table if not exists` non tocca una tabella già esistente: le colonne
-- aggiunte dopo la prima versione vanno garantite anche sui database in uso.
alter table sites add column if not exists published boolean not null default true;

create index if not exists sites_owner_idx on sites(owner_id);
create index if not exists sites_published_idx on sites(published, updated_at desc);

create table if not exists leads (
  id         text primary key,
  site_id    text not null references sites(id) on delete cascade,
  name       text not null default '',
  email      text not null default '',
  phone      text not null default '',
  message    text not null default '',
  read       boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leads_site_idx on leads(site_id, created_at desc);

create table if not exists chat_messages (
  id         text primary key,
  site_id    text not null references sites(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  text       text not null default '',
  images     text[] not null default '{}',
  ask        jsonb,
  answers    jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_site_idx on chat_messages(site_id, created_at);

-- Analytics: una riga per visita, una per clic. Serie temporali calcolabili per giorno.
create table if not exists site_views (
  id         bigserial primary key,
  site_id    text not null references sites(id) on delete cascade,
  visitor_id text,
  created_at timestamptz not null default now()
);

create index if not exists site_views_idx on site_views(site_id, created_at);

create table if not exists site_events (
  id         bigserial primary key,
  site_id    text not null references sites(id) on delete cascade,
  label      text not null,
  created_at timestamptz not null default now()
);

create index if not exists site_events_idx on site_events(site_id, created_at);

-- Rate limit condiviso tra istanze serverless.
create table if not exists rate_limits (
  key      text primary key,
  count    int not null,
  reset_at timestamptz not null
);

create table if not exists password_resets (
  token_hash text primary key,
  user_id    text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_user_idx on password_resets(user_id);

create table if not exists error_logs (
  id         bigserial primary key,
  source     text not null,
  message    text not null,
  detail     text,
  user_id    text,
  created_at timestamptz not null default now()
);

create index if not exists error_logs_idx on error_logs(created_at desc);
