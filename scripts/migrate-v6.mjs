/**
 * Migrazione v6: contabilità dei token usati dall'assistente.
 *
 *   node --env-file=.env.local scripts/migrate-v6.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  create table if not exists ai_usage (
    id            bigserial primary key,
    user_id       text references users(id) on delete cascade,
    site_id       text,
    provider      text not null,
    model         text not null,
    prompt_tokens int not null default 0,
    output_tokens int not null default 0,
    cached_tokens int not null default 0,
    created_at    timestamptz not null default now()
  )
`;
await sql`create index if not exists ai_usage_user_idx on ai_usage(user_id, created_at desc)`;

const columns = await sql`
  select column_name from information_schema.columns
  where table_name = 'ai_usage' order by column_name
`;

console.log("migrazione v6 completata:", {
  colonne: columns.map((row) => row.column_name).join(", "),
});
