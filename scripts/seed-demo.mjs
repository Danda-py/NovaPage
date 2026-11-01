import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const file = new URL("../data/novapage.json", import.meta.url);

if (!existsSync(file)) {
  console.log("nessun data/novapage.json: demo non creata");
  process.exit(0);
}

const data = JSON.parse(readFileSync(file, "utf8"));
const demo = (data.sites ?? []).find((site) => site.slug === "casa-aurora");
if (!demo) {
  console.log("demo casa-aurora non trovata nel file dati");
  process.exit(0);
}

// La demo è contenuto pubblico del sito: resta senza proprietario e non viene ereditata.
// Se la demo è già passata all'HTML libero, il re-seed non lo cancella.
await sql`
  insert into sites (id, owner_id, slug, config)
  values ('site_demo', null, 'casa-aurora', ${JSON.stringify(demo.config)}::jsonb)
  on conflict (slug) do update set
    config = excluded.config || case
      when sites.config ? 'html' then jsonb_build_object('html', sites.config->'html')
      else '{}'::jsonb
    end,
    updated_at = now()
`;

const rows = await sql`select id, slug, owner_id from sites where slug = 'casa-aurora'`;
console.log("demo:", rows[0]);
