/**
 * Migrazione v7: chiave Gemini personale dell'account, cifrata a riposo.
 *
 *   node --env-file=.env.local scripts/migrate-v7.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`alter table users add column if not exists gemini_key text`;

const columns = await sql`
  select column_name from information_schema.columns
  where table_name = 'users' and column_name = 'gemini_key'
`;

console.log("migrazione v7 completata:", {
  colonna: columns.length ? "gemini_key presente" : "MANCANTE",
});
