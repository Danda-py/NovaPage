/**
 * Migrazione v4: cronologia delle versioni delle pagine.
 *
 *   node --env-file=.env.local scripts/migrate-v4.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  create table if not exists site_versions (
    id         text primary key,
    site_id    text not null references sites(id) on delete cascade,
    config     jsonb not null,
    created_at timestamptz not null default now()
  )
`;
await sql`create index if not exists site_versions_site_idx on site_versions(site_id, created_at desc)`;

const tables = await sql`
  select table_name from information_schema.tables where table_name = 'site_versions'
`;
const columns = await sql`
  select column_name from information_schema.columns where table_name = 'site_versions' order by column_name
`;

console.log("migrazione v4 completata:", {
  tabella: tables.length === 1,
  colonne: columns.map((row) => row.column_name).join(", "),
});
