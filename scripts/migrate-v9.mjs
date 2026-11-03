/**
 * Migrazione v9: domini personalizzati (primario, alias, token e verifica).
 *
 *   node --env-file=.env.local scripts/migrate-v9.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`alter table sites add column if not exists custom_domain text`;
await sql`alter table sites add column if not exists custom_domain_token text`;
await sql`alter table sites add column if not exists custom_domain_verified_at timestamptz`;
await sql`alter table sites add column if not exists custom_domain_alias text`;
await sql`
  create unique index if not exists sites_custom_domain_idx
    on sites (lower(custom_domain)) where custom_domain is not null
`;
await sql`
  create unique index if not exists sites_custom_domain_alias_idx
    on sites (lower(custom_domain_alias)) where custom_domain_alias is not null
`;

const columns = await sql`
  select column_name from information_schema.columns
  where table_name = 'sites'
    and column_name in (
      'custom_domain', 'custom_domain_token', 'custom_domain_verified_at', 'custom_domain_alias'
    )
`;

console.log("migrazione v9 completata:", {
  colonne: columns.length === 4 ? "presenti" : "MANCANTI",
});
