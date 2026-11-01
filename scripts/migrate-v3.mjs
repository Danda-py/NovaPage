import { neon } from "@neondatabase/serverless";

/**
 * Migrazione v3: stato di pubblicazione delle pagine.
 * Le pagine esistenti restano pubblicate.
 *   node --env-file=.env.local scripts/migrate-v3.mjs
 */
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL non configurata.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`alter table sites add column if not exists published boolean not null default true`;
await sql`create index if not exists sites_published_idx on sites(published, updated_at desc)`;

const rows = await sql`
  select count(*)::int as total,
         count(*) filter (where published)::int as pubblicate,
         count(*) filter (where not published)::int as bozze
  from sites
`;
console.log("migrazione v3 completata:", rows[0]);
