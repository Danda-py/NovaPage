/**
 * Migrazione v10: cambio email con verifica sul nuovo indirizzo.
 *
 *   node --env-file=.env.local scripts/migrate-v10.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  create table if not exists email_changes (
    token_hash text primary key,
    user_id    text not null references users(id) on delete cascade,
    new_email  text not null,
    expires_at timestamptz not null,
    used_at    timestamptz,
    created_at timestamptz not null default now()
  )
`;
await sql`create index if not exists email_changes_user_idx on email_changes(user_id)`;

const table = await sql`
  select table_name from information_schema.tables
  where table_name = 'email_changes'
`;

console.log("migrazione v10 completata:", {
  tabella: table.length ? "email_changes presente" : "MANCANTE",
});
