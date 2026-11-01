/**
 * Migrazione v8: punti di ripristino legati ai messaggi della chat.
 *
 *   node --env-file=.env.local scripts/migrate-v8.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`alter table site_versions add column if not exists message_id text`;
await sql`
  create index if not exists site_versions_message_idx
    on site_versions(site_id, message_id)
    where message_id is not null
`;

const columns = await sql`
  select column_name from information_schema.columns
  where table_name = 'site_versions' and column_name = 'message_id'
`;

console.log("migrazione v8 completata:", {
  colonna: columns.length ? "message_id presente" : "MANCANTE",
});
