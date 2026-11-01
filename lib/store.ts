import { db } from "./db";
import { newId, SITE_TEMPLATES, templateConfig, type Ask, type Site } from "./site";

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
  /** Segreto TOTP in base32: presente anche prima della conferma (attivazione in corso). */
  twoFactorSecret: string | null;
  twoFactorEnabled: boolean;
  /** Hash dei codici di recupero già emessi; un codice viene consumato al primo uso. */
  twoFactorRecovery: string[];
  /** Chiave Gemini personale cifrata; null = si usa quella dell'installazione. */
  geminiKeyCipher: string | null;
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
  /** false = bozza: link pubblico 404 e pagina esclusa dalla sitemap. */
  published: boolean;
  /** Dominio collegato (es. www.miopanetteria.it), se presente. */
  customDomain?: string;
  /** L'altro nome della coppia apex/www, servito dalla stessa pagina. */
  customDomainAlias?: string;
  /** Token TXT per dimostrare la proprietà del dominio. */
  customDomainToken?: string;
  domainVerified: boolean;
  config: Site;
  createdAt: string;
  updatedAt: string;
  stats: SiteStats;
};

export type DayStat = { day: string; views: number; clicks: number };

/** Snapshot salvato prima di una modifica: permette di tornare indietro. */
export type SiteVersion = { id: string; createdAt: string };

const MAX_VERSIONS = 20;

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
  /** Il titolare ha già gestito la richiesta. */
  handled: boolean;
  /** Promemoria privato del titolare: non esce mai dalla sua area. */
  notes: string;
  repliedAt: string | null;
};

const MAX_CHAT = 300;

/** Web Crypto: niente `node:crypto`, che non esiste nel bundle Edge di instrumentation. */
function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/** Violazione di vincolo unique di Postgres (23505). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
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
  published: boolean | null;
  config: Site;
  created_at: string | Date;
  updated_at: string | Date;
  views: number | null;
  uniques: number | null;
  clicks: Record<string, number> | null;
  total_clicks: number | null;
  custom_domain: string | null;
  custom_domain_alias: string | null;
  custom_domain_token: string | null;
  custom_domain_verified_at: string | Date | null;
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
  handled: boolean | null;
  notes: string | null;
  replied_at: string | Date | null;
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
  two_factor_secret?: string | null;
  two_factor_enabled?: boolean | null;
  two_factor_recovery?: string[] | null;
  gemini_key?: string | null;
  created_at: string | Date;
};

const iso = (value: string | Date) => new Date(value).toISOString();

function mapSite(row: SiteRow): StoredSite {
  return {
    id: row.id,
    ownerId: row.owner_id ?? undefined,
    slug: row.slug,
    published: row.published ?? true,
    ...(row.custom_domain ? { customDomain: row.custom_domain } : null),
    ...(row.custom_domain_alias ? { customDomainAlias: row.custom_domain_alias } : null),
    ...(row.custom_domain_token ? { customDomainToken: row.custom_domain_token } : null),
    domainVerified: Boolean(row.custom_domain_verified_at),
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
  handled: row.handled ?? false,
  notes: row.notes ?? "",
  repliedAt: row.replied_at ? iso(row.replied_at) : null,
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
  twoFactorSecret: row.two_factor_secret ?? null,
  twoFactorEnabled: row.two_factor_enabled ?? false,
  twoFactorRecovery: Array.isArray(row.two_factor_recovery) ? row.two_factor_recovery : [],
  geminiKeyCipher: row.gemini_key ?? null,
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

/** Un indirizzo è libero se non lo usa nessun'altra pagina (la propria non conta). */
export async function isSlugAvailable(slug: string, ignoreId?: string): Promise<boolean> {
  const sql = db();
  const normalized = slugify(slug);
  const rows = (await sql`select id from sites where slug = ${normalized} limit 1`) as Array<{
    id: string;
  }>;
  return !rows[0] || rows[0].id === ignoreId;
}

/**
 * La landing da servire quando la richiesta arriva su un dominio collegato.
 * Solo i domini verificati e le pagine pubblicate rispondono: un dominio in
 * attesa non deve mostrare contenuti.
 */
export async function getSiteByCustomDomain(domain: string): Promise<StoredSite | null> {
  const sql = db();
  const rows = (await sql.query(
    `${SITE_SELECT} where (lower(s.custom_domain) = lower($1) or lower(s.custom_domain_alias) = lower($1)) and s.custom_domain_verified_at is not null and s.published = true limit 1`,
    [domain],
  )) as SiteRow[];
  return rows[0] ? mapSite(rows[0]) : null;
}

/** Qualsiasi pagina (anche in attesa di verifica) che occupa già un dominio. */
export async function findSiteIdByDomain(domain: string): Promise<string | null> {
  const sql = db();
  const rows = (await sql`
    select id from sites
    where lower(custom_domain) = lower(${domain}) or lower(custom_domain_alias) = lower(${domain})
    limit 1
  `) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

export async function createSite(
  ownerId: string,
  title: string,
  template?: string,
): Promise<StoredSite> {
  const clean = title.trim().slice(0, 60) || "La mia pagina";
  if (template && SITE_TEMPLATES.some((item) => item.id === template)) {
    return insertSite(ownerId, templateConfig(clean, template), clean);
  }
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

  return insertSite(ownerId, config, clean);
}

/** Inserimento con slug unico e retry: due creazioni simultanee possono scegliere lo stesso slug. */
async function insertSite(ownerId: string, config: Site, title: string): Promise<StoredSite> {
  const sql = db();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await uniqueSlug(slugify(title));
    try {
      const rows = (await sql`
        insert into sites (id, owner_id, slug, config)
        values (${id("site")}, ${ownerId}, ${slug}, ${JSON.stringify(config)}::jsonb)
        returning id
      `) as Array<{ id: string }>;

      return (await getSite(rows[0].id))!;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  throw new Error("Impossibile creare la pagina: riprova.");
}

/** Copia una pagina dell'utente con nuovi id dei blocchi e slug derivato dal titolo. */
export async function duplicateSite(siteId: string, ownerId: string): Promise<StoredSite | null> {
  const source = await getSite(siteId);
  if (!source || source.ownerId !== ownerId) return null;

  const title = `${source.config.meta.title} (copia)`.slice(0, 60);
  const config: Site = {
    ...structuredClone(source.config),
    meta: { ...source.config.meta, title },
    blocks: source.config.blocks.map((block) => ({ ...block, id: newId("blk") })),
  };

  return insertSite(ownerId, config, title);
}

export async function updateSite(
  siteId: string,
  patch: { config?: Site; slug?: string; title?: string; published?: boolean },
): Promise<StoredSite | null> {
  const sql = db();
  // Verifica leggera: la lettura completa del sito include gli aggregati di
  // analytics e non serve solo per capire se il sito esiste.
  const exists = (await sql`select id from sites where id = ${siteId} limit 1`) as Array<{ id: string }>;
  if (!exists.length) return null;

  if (patch.config && Array.isArray(patch.config.blocks)) {
    const previous = (await sql`select config from sites where id = ${siteId} limit 1`) as Array<{
      config: Site;
    }>;
    if (previous[0] && JSON.stringify(previous[0].config) !== JSON.stringify(patch.config)) {
      await saveVersion(siteId, previous[0].config);
    }
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
  if (typeof patch.published === "boolean") {
    await sql`
      update sites set published = ${patch.published}, updated_at = now() where id = ${siteId}
    `;
  }
  return getSite(siteId);
}

/** Collega (o rimuove, con domain null) un dominio personalizzato, sempre da verificare. */
export async function setSiteCustomDomain(
  siteId: string,
  domain: string | null,
  token: string | null = null,
  alias: string | null = null,
): Promise<StoredSite | null> {
  const sql = db();
  const current = await getSite(siteId);
  if (!current) return null;

  // Salvare di nuovo lo stesso dominio non deve azzerare la verifica appena
  // fatta: l'utente si ritroverebbe il sito offline senza capire perché.
  const same =
    domain !== null &&
    (current.customDomain ?? "").toLowerCase() === domain.toLowerCase() &&
    (current.customDomainAlias ?? "").toLowerCase() === (alias ?? "").toLowerCase();
  if (same) return current;

  await sql`
    update sites
    set custom_domain = ${domain},
        custom_domain_alias = ${domain ? alias : null},
        custom_domain_token = ${domain ? token : null},
        custom_domain_verified_at = null,
        updated_at = now()
    where id = ${siteId}
  `;
  return getSite(siteId);
}

export async function markSiteDomainVerified(siteId: string): Promise<StoredSite | null> {
  const sql = db();
  await sql`
    update sites set custom_domain_verified_at = now(), updated_at = now() where id = ${siteId}
  `;
  return getSite(siteId);
}

/**
 * Cronologia: la configurazione precedente viene salvata prima di ogni modifica
 * e si tengono le ultime 20 per pagina. Un errore qui non deve mai rompere il
 * salvataggio: l'utente perde la cronologia, non la pagina.
 */
export async function saveVersion(siteId: string, config: Site): Promise<void> {
  try {
    const sql = db();
    await sql`
      insert into site_versions (id, site_id, config)
      values (${id("ver")}, ${siteId}, ${JSON.stringify(config)}::jsonb)
    `;
    await sql`
      delete from site_versions
      where site_id = ${siteId}
        and id not in (
          select id from site_versions where site_id = ${siteId}
          order by created_at desc limit ${MAX_VERSIONS}
        )
    `;
  } catch {
    // cronologia non disponibile (migrazione non applicata): si continua
  }
}

/**
 * Punto di ripristino di un turno di chat: la pagina com'è subito *dopo* quel
 * messaggio. Restare dentro 5 voci significa poter tornare indietro di cinque
 * richieste senza dover leggere una cronologia di date.
 */
export async function saveMessageVersion(
  siteId: string,
  config: Site,
  messageId: string,
): Promise<void> {
  try {
    const sql = db();
    await sql`
      insert into site_versions (id, site_id, config, message_id)
      values (${id("ver")}, ${siteId}, ${JSON.stringify(config)}::jsonb, ${messageId})
    `;
  } catch {
    // Migrazione non applicata: la chat funziona, si perde solo il ripristino.
  }
}

/** Gli ultimi messaggi con una fotografia della pagina, dal più recente. */
export async function listRestorableMessages(siteId: string, limit = 5): Promise<string[]> {
  try {
    const sql = db();
    const rows = (await sql`
      select message_id from site_versions
      where site_id = ${siteId} and message_id is not null
      order by created_at desc limit ${limit}
    `) as Array<{ message_id: string }>;
    return rows.map((row) => row.message_id);
  } catch {
    return [];
  }
}

export async function getVersionByMessage(siteId: string, messageId: string): Promise<Site | null> {
  const sql = db();
  const rows = (await sql`
    select config from site_versions
    where site_id = ${siteId} and message_id = ${messageId}
    order by created_at desc limit 1
  `) as Array<{ config: Site }>;
  return rows[0]?.config ?? null;
}

export async function listVersions(siteId: string): Promise<SiteVersion[]> {
  try {
    const sql = db();
    const rows = (await sql`
      select id, created_at from site_versions
      where site_id = ${siteId}
      order by created_at desc limit ${MAX_VERSIONS}
    `) as Array<{ id: string; created_at: string | Date }>;
    return rows.map((row) => ({ id: row.id, createdAt: iso(row.created_at) }));
  } catch {
    return [];
  }
}

export async function getVersion(siteId: string, versionId: string): Promise<Site | null> {
  const sql = db();
  const rows = (await sql`
    select config from site_versions where id = ${versionId} and site_id = ${siteId} limit 1
  `) as Array<{ config: Site }>;
  return rows[0]?.config ?? null;
}

export async function deleteSite(siteId: string): Promise<boolean> {  const sql = db();
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

export async function listLeads(siteId: string): Promise<Lead[]> {
  const sql = db();
  const rows = (await sql`
    select * from leads where site_id = ${siteId} order by created_at desc
  `) as LeadRow[];
  return rows.map(mapLead);
}

/** Solo i contatti dei siti dell'utente: nessun dato di altri account. */
export async function listLeadsForOwner(ownerId: string): Promise<Lead[]> {
  const sql = db();
  const rows = (await sql`
    select l.* from leads l
    join sites s on s.id = l.site_id
    where s.owner_id = ${ownerId}
    order by l.created_at desc
  `) as LeadRow[];
  return rows.map(mapLead);
}

export async function deleteLead(siteId: string, leadId: string): Promise<boolean> {
  const sql = db();
  const rows = (await sql`
    delete from leads where id = ${leadId} and site_id = ${siteId} returning id
  `) as Array<{ id: string }>;
  return rows.length > 0;
}

/** Un solo contatto: serve alla risposta e al cambio di stato. */
export async function getLead(siteId: string, leadId: string): Promise<Lead | null> {
  const sql = db();
  const rows = (await sql`
    select * from leads where id = ${leadId} and site_id = ${siteId} limit 1
  `) as LeadRow[];
  return rows[0] ? mapLead(rows[0]) : null;
}

/** Stato "gestito" e nota privata del titolare. I campi assenti restano invariati. */
export async function updateLead(
  siteId: string,
  leadId: string,
  patch: { handled?: boolean; notes?: string },
): Promise<Lead | null> {
  const sql = db();
  const rows = (await sql`
    update leads set
      handled = coalesce(${patch.handled ?? null}::boolean, handled),
      notes = coalesce(${patch.notes ?? null}::text, notes)
    where id = ${leadId} and site_id = ${siteId}
    returning *
  `) as LeadRow[];
  return rows[0] ? mapLead(rows[0]) : null;
}

/** Dopo una risposta inviata: il contatto risulta letto, gestito e con la data. */
export async function markLeadReplied(siteId: string, leadId: string): Promise<Lead | null> {
  const sql = db();
  const rows = (await sql`
    update leads set replied_at = now(), handled = true, read = true
    where id = ${leadId} and site_id = ${siteId}
    returning *
  `) as LeadRow[];
  return rows[0] ? mapLead(rows[0]) : null;
}

export async function markLeadsRead(siteId: string): Promise<number> {
  const sql = db();
  const rows = (await sql`
    update leads set read = true where site_id = ${siteId} and read = false returning id
  `) as Array<{ id: string }>;
  return rows.length;
}

export async function countUnread(siteId: string): Promise<number> {
  const sql = db();
  const rows = (await sql`
    select count(*)::int as n from leads where site_id = ${siteId} and read = false
  `) as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

/**
 * Verifica che la migrazione v3 (colonna `published`) sia stata applicata.
 * Serve a non pubblicare un deploy che sembra sano ma non può salvare lo stato
 * di pubblicazione né elencare le landing in sitemap.
 */
export async function schemaReady(): Promise<boolean> {
  try {
    const sql = db();
    const rows = (await sql`
      select 1 from information_schema.columns
      where table_name = 'sites' and column_name = 'published'
      limit 1
    `) as unknown[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Ping leggero per l'health check: non espone nulla del contenuto del database. */
export async function pingDatabase(): Promise<boolean> {
  try {
    const sql = db();
    await sql`select 1`;
    return true;
  } catch {
    return false;
  }
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

/** Email del titolare e dati minimi della pagina, per le notifiche ai contatti. */
export async function findOwnerContact(
  siteId: string,
): Promise<{ email: string; slug: string; title: string } | null> {
  const sql = db();
  const rows = (await sql`
    select u.email, s.slug, coalesce(s.config->'meta'->>'title', s.slug) as title
    from sites s
    join users u on u.id = s.owner_id
    where s.id = ${siteId}
    limit 1
  `) as Array<{ email: string; slug: string; title: string }>;
  return rows[0] ?? null;
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

export type EmailUpdate = "ok" | "taken" | "missing";

/** Cambio email: il vincolo unique è la sola condizione di errore prevedibile. */
export async function setUserGeminiKey(userId: string, cipher: string | null): Promise<void> {
  const sql = db();
  await sql`update users set gemini_key = ${cipher} where id = ${userId}`;
}

export async function setTwoFactorSecret(userId: string, secret: string | null): Promise<void> {
  const sql = db();
  // Cambiare segreto azzera anche lo stato: si riparte da un'attivazione da confermare.
  await sql`
    update users set two_factor_secret = ${secret}, two_factor_enabled = false where id = ${userId}
  `;
}

export async function enableTwoFactor(userId: string, recoveryHashes: string[]): Promise<void> {
  const sql = db();
  await sql`
    update users
    set two_factor_enabled = true, two_factor_recovery = ${JSON.stringify(recoveryHashes)}::jsonb
    where id = ${userId}
  `;
}

export async function disableTwoFactor(userId: string): Promise<void> {
  const sql = db();
  await sql`
    update users
    set two_factor_secret = null, two_factor_enabled = false, two_factor_recovery = '[]'::jsonb
    where id = ${userId}
  `;
}

/** Consuma un codice di recupero: la query rimuove solo se il codice è presente. */
export async function consumeTwoFactorRecovery(userId: string, hash: string): Promise<boolean> {
  const sql = db();
  const rows = (await sql`
    update users
    set two_factor_recovery = coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements(two_factor_recovery) as value
      where value <> to_jsonb(${hash}::text)
    ), '[]'::jsonb)
    where id = ${userId} and two_factor_recovery @> ${JSON.stringify([hash])}::jsonb
    returning id
  `) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function updateUserEmail(userId: string, email: string): Promise<EmailUpdate> {
  const sql = db();
  try {
    const rows = (await sql`
      update users set email = ${email.toLowerCase().trim()}
      where id = ${userId} returning id
    `) as Array<{ id: string }>;
    return rows.length > 0 ? "ok" : "missing";
  } catch (error) {
    if (isUniqueViolation(error)) return "taken";
    throw error;
  }
}

/** Segna come letti tutti i contatti dei siti dell'utente, in una sola query. */
export async function markAllLeadsReadForOwner(ownerId: string): Promise<number> {
  const sql = db();
  const rows = (await sql`
    update leads set read = true
    where read = false and site_id in (select id from sites where owner_id = ${ownerId})
    returning id
  `) as Array<{ id: string }>;
  return rows.length;
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

/**
 * Contabilità dei token: serve a sapere quanto costa l'assistente e a tarare
 * modello e limiti senza indovinare. Non deve mai rompere la chat.
 */
export async function recordAiUsage(input: {
  userId?: string;
  siteId?: string;
  provider: string;
  model: string;
  prompt: number;
  output: number;
  cached?: number;
}): Promise<void> {
  try {
    const sql = db();
    await sql`
      insert into ai_usage (user_id, site_id, provider, model, prompt_tokens, output_tokens, cached_tokens)
      values (${input.userId ?? null}, ${input.siteId ?? null}, ${input.provider.slice(0, 40)},
              ${input.model.slice(0, 80)}, ${Math.max(0, Math.round(input.prompt))},
              ${Math.max(0, Math.round(input.output))}, ${Math.max(0, Math.round(input.cached ?? 0))})
    `;
  } catch {
    // la telemetria non è essenziale: se manca la tabella si continua
  }
}

export type AiUsageSummary = { prompt: number; output: number; cached: number; requests: number };

/** Token consumati dall'utente nel mese corrente. */
export async function aiUsageThisMonth(userId: string): Promise<AiUsageSummary> {
  try {
    const sql = db();
    const rows = (await sql`
      select coalesce(sum(prompt_tokens), 0)::int as prompt,
             coalesce(sum(output_tokens), 0)::int as output,
             coalesce(sum(cached_tokens), 0)::int as cached,
             count(*)::int as requests
      from ai_usage
      where user_id = ${userId} and created_at >= date_trunc('month', now())
    `) as Array<{ prompt: number; output: number; cached: number; requests: number }>;
    return rows[0] ?? { prompt: 0, output: 0, cached: 0, requests: 0 };
  } catch {
    return { prompt: 0, output: 0, cached: 0, requests: 0 };
  }
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

    // Alert best-effort: import dinamico per non creare un ciclo
    // store -> email -> store, e nessun errore se l'email non è configurata.
    if (process.env.ADMIN_EMAIL) {
      void import("./email")
        .then(({ notifyAdmin }) => notifyAdmin({ source: input.source, message: input.message }))
        .catch(() => undefined);
    }
  } catch {
    // il logging non deve mai rompere la richiesta
  }
}

export async function listPublishedSites(): Promise<
  Array<{ slug: string; title: string; description: string; updatedAt: string }>
> {
  const sql = db();
  // Estraiamo solo i campi della scheda link: la sitemap non deve caricare i config interi.
  const rows = (await sql`
    select slug,
           config->'meta'->>'title' as title,
           config->'meta'->>'description' as description,
           updated_at
    from sites
    where published = true
    order by updated_at desc limit 5000
  `) as Array<{
    slug: string;
    title: string | null;
    description: string | null;
    updated_at: string | Date;
  }>;
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title ?? row.slug,
    description: row.description ?? "",
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
