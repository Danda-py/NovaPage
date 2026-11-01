import { db } from "./db";
import type { Ask, Site } from "./site";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  images?: string[];
  ask?: Ask;
  answers?: Record<string, string>;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  sessionVersion: number;
  termsAcceptedAt: string | null;
  createdAt: string;
};

export type SiteStats = {
  views: number;
  uniques: number;
  clicks: Record<string, number>;
  totalClicks: number;
};

export type StoredSite = {
  id: string;
  ownerId?: string;
  slug: string;
  config: Site;
  createdAt: string;
  updatedAt: string;
  stats: SiteStats;
};

export type DayStat = { day: string; views: number; clicks: number };

export type Lead = {
  id: string;
  siteId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  read: boolean;
  consentAt: string | null;
};

const MAX_CHAT = 300;

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "la-mia-pagina"
  );
}

type SiteRow = {
  id: string;
  owner_id: string | null;
  slug: string;
  config: Site;
  created_at: string | Date;
  updated_at: string | Date;
  views: number | null;
  uniques: number | null;
  clicks: Record<string, number> | null;
  total_clicks: number | null;
};

type LeadRow = {
  id: string;
  site_id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  read: boolean;
  consent_at: string | Date | null;
  created_at: string | Date;
};

type ChatRow = {
  id: string;
  role: "user" | "assistant";
  text: string;
  images: string[] | null;
  ask: Ask | null;
  answers: Record<string, string> | null;
  created_at: string | Date;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  session_version: number;
  terms_accepted_at: string | Date | null;
  created_at: string | Date;
};

const iso = (value: string | Date) => new Date(value).toISOString();

function mapSite(row: SiteRow): StoredSite {
  return {
    id: row.id,
    ownerId: row.owner_id ?? undefined,
    slug: row.slug,
    config: row.config,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    stats: {
      views: row.views ?? 0,
      uniques: row.uniques ?? 0,
      clicks: row.clicks ?? {},
      totalClicks: row.total_clicks ?? 0,
    },
  };
}

const mapLead = (row: LeadRow): Lead => ({
  id: row.id,
  siteId: row.site_id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  message: row.message,
  read: row.read,
  consentAt: row.consent_at ? iso(row.consent_at) : null,
  createdAt: iso(row.created_at),
});

const mapChat = (row: ChatRow): ChatMessage => ({
  id: row.id,
  role: row.role,
  text: row.text,
  images: row.images?.length ? row.images : undefined,
  ask: row.ask ?? undefined,
  answers: row.answers ?? undefined,
  createdAt: iso(row.created_at),
});

const mapUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  salt: row.salt,
  sessionVersion: row.session_version ?? 0,
  termsAcceptedAt: row.terms_accepted_at ? iso(row.terms_accepted_at) : null,
  createdAt: iso(row.created_at),
});

/** Aggregati di analytics calcolati dalle tabelle, senza contatori duplicati sul sito. */
const SITE_SELECT = `
  select s.*,
         coalesce(v.views, 0)::int as views,
         coalesce(v.uniques, 0)::int as uniques,
         coalesce(e.clicks, '{}'::jsonb) as clicks,
         coalesce(e.total_clicks, 0)::int as total_clicks
  from sites s
  left join (
    select site_id, count(*)::int as views, count(distinct visitor_id)::int as uniques
    from site_views group by site_id
  ) v on v.site_id = s.id
  left join (
    select site_id, jsonb_object_agg(label, n) as clicks, sum(n)::int as total_clicks
    from (
      select site_id, label, count(*)::int as n from site_events group by site_id, label
    ) per_label
    group by site_id
  ) e on e.site_id = s.id
`;

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const sql = db();
  const rows = (await sql`select id, slug from sites where slug like ${`${base}%`}`) as Array<{
    id: string;
    slug: string;
  }>;
  const taken = new Set(rows.filter((r) => r.id !== ignoreId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 200; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function listSites(ownerId: string): Promise<StoredSite[]> {
  const sql = db();
  const rows = (await sql.query(`${SITE_SELECT} where s.owner_id = $1 order by s.updated_at desc`, [
    ownerId,
  ])) as SiteRow[];
  return rows.map(mapSite);
}

export async function getSite(siteId: string): Promise<StoredSite | null> {
  const sql = db();
  const rows = (await sql.query(`${SITE_SELECT} where s.id = $1 limit 1`, [siteId])) as SiteRow[];
  return rows[0] ? mapSite(rows[0]) : null;
}

export async function getSiteBySlug(slug: string): Promise<StoredSite | null> {
  const sql = db();
  const rows = (await sql.query(`${SITE_SELECT} where s.slug = $1 limit 1`, [slug])) as SiteRow[];
  return rows[0] ? mapSite(rows[0]) : null;
}

export async function createSite(ownerId: string, title: string): Promise<StoredSite> {
  const sql = db();
  const clean = title.trim().slice(0, 60) || "La mia pagina";
  const slug = await uniqueSlug(slugify(clean));
  const config = {
    meta: { title: clean, description: "Pagina creata con NovaPage" },
    theme: {
      bg_color: "#09090b",
      text_color: "#f4f4f5",
      accent_color: "#8b5cf6",
      accent2: "#22d3ee",
      style: "aurora",
      font: "sans",
    },
    blocks: [
      {
        id: id("blk"),
        type: "hero",
        data: {
          title: clean,
          subtitle: "Una frase che spiega cosa fai",
          badge: "Aperto ora",
        },
      },
    ],
  } satisfies Site;

  const rows = (await sql`
    insert into sites (id, owner_id, slug, config)
    values (${id("site")}, ${ownerId}, ${slug}, ${JSON.stringify(config)}::jsonb)
    returning id
  `) as Array<{ id: string }>;

  return (await getSite(rows[0].id))!;
}

export async function updateSite(
  siteId: string,
  patch: { config?: Site; slug?: string; title?: string },
): Promise<StoredSite | null> {
  const sql = db();
  const existing = await getSite(siteId);
  if (!existing) return null;

  if (patch.config && Array.isArray(patch.config.blocks)) {
    await sql`update sites set config = ${JSON.stringify(patch.config)}::jsonb, updated_at = now() where id = ${siteId}`;
  }
  if (patch.slug) {
    const slug = await uniqueSlug(slugify(patch.slug), siteId);
    await sql`update sites set slug = ${slug}, updated_at = now() where id = ${siteId}`;
  }
  if (patch.title?.trim()) {
    const title = patch.title.trim().slice(0, 80);
    await sql`
      update sites
      set config = jsonb_set(config, '{meta,title}', to_jsonb(${title}::text)), updated_at = now()
      where id = ${siteId}
    `;
  }
  return getSite(siteId);
}

export async function deleteSite(siteId: string): Promise<boolean> {
  const sql = db();
  const rows = (await sql`delete from sites where id = ${siteId} returning id`) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function trackView(siteId: string, visitorId?: string): Promise<boolean> {
  const sql = db();
  const site = (await sql`select id from sites where id = ${siteId} limit 1`) as Array<{ id: string }>;
  if (!site.length) return false;
  await sql`
    insert into site_views (site_id, visitor_id)
    values (${siteId}, ${visitorId ? visitorId.slice(0, 80) : null})
  `;
  return true;
}

export async function trackClick(siteId: string, label: string): Promise<boolean> {
  const sql = db();
  const site = (await sql`select id from sites where id = ${siteId} limit 1`) as Array<{ id: string }>;
  if (!site.length) return false;
  await sql`
    insert into site_events (site_id, label)
    values (${siteId}, ${(label || "senza-nome").slice(0, 60)})
  `;
  return true;
}

/** Visite e clic per giorno, con i giorni vuoti a zero. */
export async function dailyStats(siteId: string, days = 30): Promise<DayStat[]> {
  const sql = db();
  const rows = (await sql`
    with days as (
      select generate_series(
        (current_date - make_interval(days => ${days - 1}))::date,
        current_date,
        interval '1 day'
      )::date as day
    )
    select to_char(d.day, 'YYYY-MM-DD') as day,
           (select count(*)::int from site_views v
             where v.site_id = ${siteId} and v.created_at::date = d.day) as views,
           (select count(*)::int from site_events e
             where e.site_id = ${siteId} and e.created_at::date = d.day) as clicks
    from days d
    order by d.day
  `) as DayStat[];
  return rows;
}

export async function addLead(
  siteId: string,
  input: { name: string; email: string; phone: string; message: string },
): Promise<Lead | null> {
  const sql = db();
  const site = (await sql`select id from sites where id = ${siteId} limit 1`) as Array<{ id: string }>;
  if (!site.length) return null;

  const rows = (await sql`
    insert into leads (id, site_id, name, email, phone, message, consent_at)
    values (${id("lead")}, ${siteId}, ${input.name.slice(0, 80)}, ${input.email.slice(0, 120)},
            ${input.phone.slice(0, 40)}, ${input.message.slice(0, 1000)}, now())
    returning *
  `) as LeadRow[];
  return mapLead(rows[0]);
}

export async function listLeads(siteId?: string): Promise<Lead[]> {
  const sql = db();
  const rows = (siteId
    ? await sql`select * from leads where site_id = ${siteId} order by created_at desc`
    : await sql`select * from leads order by created_at desc`) as LeadRow[];
  return rows.map(mapLead);
}

export async function markLeadsRead(siteId: string): Promise<number> {
  const sql = db();
  const rows = (await sql`
    update leads set read = true where site_id = ${siteId} and read = false returning id
  `) as Array<{ id: string }>;
  return rows.length;
}

export async function countUnread(siteId?: string): Promise<number> {
  const sql = db();
  const rows = (siteId
    ? await sql`select count(*)::int as n from leads where site_id = ${siteId} and read = false`
    : await sql`select count(*)::int as n from leads where read = false`) as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

export async function getChat(siteId: string): Promise<ChatMessage[]> {
  const sql = db();
  const rows = (await sql`
    select * from chat_messages where site_id = ${siteId} order by created_at asc, id asc
  `) as ChatRow[];
  return rows.map(mapChat);
}

export async function appendChat(
  siteId: string,
  messages: Array<Omit<ChatMessage, "id" | "createdAt">>,
): Promise<ChatMessage[]> {
  const sql = db();
  for (const message of messages) {
    await sql`
      insert into chat_messages (id, site_id, role, text, images, ask, answers)
      values (${id("msg")}, ${siteId}, ${message.role}, ${message.text},
              ${message.images ?? []},
              ${message.ask ? JSON.stringify(message.ask) : null}::jsonb,
              ${message.answers ? JSON.stringify(message.answers) : null}::jsonb)
    `;
  }

  await sql`
    delete from chat_messages
    where site_id = ${siteId}
      and id not in (
        select id from chat_messages
        where site_id = ${siteId}
        order by created_at desc, id desc
        limit ${MAX_CHAT}
      )
  `;

  return getChat(siteId);
}

export async function setChatAnswers(
  siteId: string,
  messageId: string,
  answers: Record<string, string>,
): Promise<void> {
  const sql = db();
  await sql`
    update chat_messages set answers = ${JSON.stringify(answers)}::jsonb
    where id = ${messageId} and site_id = ${siteId}
  `;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  salt: string;
  termsAccepted: boolean;
}): Promise<User | null> {
  const sql = db();
  const email = input.email.toLowerCase().trim();
  const rows = (await sql`
    insert into users (id, email, password_hash, salt, terms_accepted_at)
    values (${id("user")}, ${email}, ${input.passwordHash}, ${input.salt},
            ${input.termsAccepted ? new Date() : null})
    on conflict (email) do nothing
    returning *
  `) as UserRow[];
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const sql = db();
  const rows = (await sql`
    select * from users where email = ${email.toLowerCase().trim()} limit 1
  `) as UserRow[];
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(userId: string): Promise<User | null> {
  const sql = db();
  const rows = (await sql`select * from users where id = ${userId} limit 1`) as UserRow[];
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
  salt: string,
): Promise<void> {
  const sql = db();
  await sql`
    update users
    set password_hash = ${passwordHash}, salt = ${salt}, session_version = session_version + 1
    where id = ${userId}
  `;
}

export async function deleteUser(userId: string): Promise<void> {
  const sql = db();
  await sql`delete from users where id = ${userId}`;
}

export async function createPasswordReset(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  const sql = db();
  await sql`delete from password_resets where user_id = ${userId} and used_at is null`;
  await sql`
    insert into password_resets (token_hash, user_id, expires_at)
    values (${tokenHash}, ${userId}, ${expiresAt})
  `;
}

export async function consumePasswordReset(tokenHash: string): Promise<string | null> {
  const sql = db();
  const rows = (await sql`
    update password_resets set used_at = now()
    where token_hash = ${tokenHash} and used_at is null and expires_at > now()
    returning user_id
  `) as Array<{ user_id: string }>;
  return rows[0]?.user_id ?? null;
}

/**
 * Contatore condiviso: l'update atomico funziona anche con più istanze serverless.
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  const sql = db();
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  const rows = (await sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${seconds}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= now()
                      then now() + make_interval(secs => ${seconds})
                      else rate_limits.reset_at end
    returning count, reset_at
  `) as Array<{ count: number; reset_at: string | Date }>;

  if (Math.random() < 0.02) {
    await sql`delete from rate_limits where reset_at < now() - interval '1 day'`;
  }

  const row = rows[0];
  if (!row) return { ok: true, retryAfter: 0 };
  const retryAfter = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000));
  return { ok: row.count <= limit, retryAfter };
}

export async function logError(input: {
  source: string;
  message: string;
  detail?: string;
  userId?: string;
}): Promise<void> {
  try {
    const sql = db();
    await sql`
      insert into error_logs (source, message, detail, user_id)
      values (${input.source.slice(0, 80)}, ${input.message.slice(0, 500)},
              ${input.detail ? input.detail.slice(0, 4000) : null},
              ${input.userId ?? null})
    `;
  } catch {
    // il logging non deve mai rompere la richiesta
  }
}

export async function listPublishedSites(): Promise<
  Array<{ slug: string; title: string; description: string; updatedAt: string }>
> {
  const sql = db();
  const rows = (await sql`
    select slug, config, updated_at from sites order by updated_at desc limit 5000
  `) as Array<{ slug: string; config: Site; updated_at: string | Date }>;
  return rows.map((row) => ({
    slug: row.slug,
    title: row.config.meta?.title ?? row.slug,
    description: row.config.meta?.description ?? "",
    updatedAt: iso(row.updated_at),
  }));
}

/**
 * Assegna al primo utente registrato i siti creati prima degli account.
 * La demo pubblica (site_demo) resta senza proprietario: è contenuto del sito di marketing.
 */
export async function claimLegacySites(ownerId: string): Promise<number> {
  const sql = db();
  const rows = (await sql`
    update sites set owner_id = ${ownerId}
    where owner_id is null and id <> 'site_demo'
    returning id
  `) as Array<{ id: string }>;
  return rows.length;
}
