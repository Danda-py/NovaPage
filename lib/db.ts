import { neon } from "@neondatabase/serverless";

type Client = ReturnType<typeof neon>;
let client: Client | null = null;

export function db(): Client {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL non configurata: aggiungila a .env.local");
  }
  client ??= neon(url);
  return client;
}
