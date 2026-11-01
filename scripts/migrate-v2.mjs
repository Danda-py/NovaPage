import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const ddl = `
  create table if not exists site_views (
    id bigserial primary key,
    site_id text not null references sites(id) on delete cascade,
    visitor_id text,
    created_at timestamptz not null default now()
  );
  create index if not exists site_views_idx on site_views(site_id, created_at);

  create table if not exists site_events (
    id bigserial primary key,
    site_id text not null references sites(id) on delete cascade,
    label text not null,
    created_at timestamptz not null default now()
  );
  create index if not exists site_events_idx on site_events(site_id, created_at);

  create table if not exists rate_limits (
    key text primary key,
    count int not null,
    reset_at timestamptz not null
  );

  create table if not exists password_resets (
    token_hash text primary key,
    user_id text not null references users(id) on delete cascade,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
  );
  create index if not exists password_resets_user_idx on password_resets(user_id);

  create table if not exists error_logs (
    id bigserial primary key,
    source text not null,
    message text not null,
    detail text,
    user_id text,
    created_at timestamptz not null default now()
  );
  create index if not exists error_logs_idx on error_logs(created_at desc);

  alter table users add column if not exists session_version int not null default 0;
  alter table users add column if not exists terms_accepted_at timestamptz;
  alter table leads add column if not exists consent_at timestamptz;
`;

for (const statement of ddl.split(";").map((s) => s.trim()).filter(Boolean)) {
  await sql.query(statement);
}

// Copia le statistiche legacy dal jsonb nelle nuove tabelle, una sola volta.
// La colonna stats viene rimossa alla fine: se non c'è più, la migrazione è già avvenuta.
const hasStats = await sql`
  select 1 from information_schema.columns
  where table_name = 'sites' and column_name = 'stats'
`;
const legacy = hasStats.length ? await sql`select id, stats from sites where stats is not null` : [];
for (const site of legacy) {
  const stats = site.stats ?? {};
  const views = Number(stats.views ?? 0);
  const visitors = Array.isArray(stats.visitors) ? stats.visitors : [];
  const clicks = stats.clicks && typeof stats.clicks === "object" ? stats.clicks : {};

  const already = await sql`select 1 from site_views where site_id = ${site.id} limit 1`;
  if (!already.length && (views > 0 || visitors.length)) {
    for (const visitor of visitors) {
      await sql`insert into site_views (site_id, visitor_id) values (${site.id}, ${String(visitor)})`;
    }
    for (let i = visitors.length; i < views; i++) {
      await sql`insert into site_views (site_id) values (${site.id})`;
    }
  }

  for (const [label, count] of Object.entries(clicks)) {
    const n = Number(count);
    if (!Number.isFinite(n) || n <= 0) continue;
    for (let i = 0; i < n; i++) {
      await sql`insert into site_events (site_id, label) values (${site.id}, ${String(label).slice(0, 60)})`;
    }
  }
}

if (hasStats.length) await sql`alter table sites drop column if exists stats`;

const counts = await sql`
  select (select count(*)::int from site_views) as views,
         (select count(*)::int from site_events) as events
`;
console.log("migrazione v2 completata:", counts[0]);
