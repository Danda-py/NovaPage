import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const file = new URL("../data/novapage.json", import.meta.url);

if (!existsSync(file)) {
  console.log("nessun data/novapage.json da migrare");
  process.exit(0);
}

const data = JSON.parse(readFileSync(file, "utf8"));

for (const user of data.users ?? []) {
  await sql`
    insert into users (id, email, password_hash, salt, created_at)
    values (${user.id}, ${user.email}, ${user.passwordHash}, ${user.salt}, ${user.createdAt})
    on conflict (email) do nothing
  `;
}

for (const site of data.sites ?? []) {
  await sql`
    insert into sites (id, owner_id, slug, config, created_at, updated_at)
    values (${site.id}, ${site.ownerId ?? null}, ${site.slug},
            ${JSON.stringify(site.config)}::jsonb,
            ${site.createdAt}, ${site.updatedAt})
    on conflict (slug) do nothing
  `;
}

for (const lead of data.leads ?? []) {
  await sql`
    insert into leads (id, site_id, name, email, phone, message, read, created_at)
    values (${lead.id}, ${lead.siteId}, ${lead.name ?? ""}, ${lead.email ?? ""},
            ${lead.phone ?? ""}, ${lead.message ?? ""}, ${lead.read ?? false}, ${lead.createdAt})
    on conflict (id) do nothing
  `;
}

for (const [siteId, messages] of Object.entries(data.chats ?? {})) {
  for (const message of messages) {
    await sql`
      insert into chat_messages (id, site_id, role, text, images, ask, answers, created_at)
      values (${message.id}, ${siteId}, ${message.role}, ${message.text ?? ""},
              ${message.images ?? []},
              ${message.ask ? JSON.stringify(message.ask) : null}::jsonb,
              ${message.answers ? JSON.stringify(message.answers) : null}::jsonb,
              ${message.createdAt})
      on conflict (id) do nothing
    `;
  }
}

const counts = await sql`
  select (select count(*)::int from users) as users,
         (select count(*)::int from sites) as sites,
         (select count(*)::int from leads) as leads,
         (select count(*)::int from chat_messages) as chat
`;

console.log("migrazione completata:", counts[0]);
