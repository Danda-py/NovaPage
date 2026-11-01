/**
 * Migrazione v5: gestione dei contatti (stato, nota privata, data di risposta).
 *
 *   node --env-file=.env.local scripts/migrate-v5.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`alter table leads add column if not exists handled boolean not null default false`;
await sql`alter table leads add column if not exists notes text not null default ''`;
await sql`alter table leads add column if not exists replied_at timestamptz`;

const columns = await sql`
  select column_name from information_schema.columns
  where table_name = 'leads' order by column_name
`;

console.log("migrazione v5 completata:", {
  colonne: columns.map((row) => row.column_name).join(", "),
});
