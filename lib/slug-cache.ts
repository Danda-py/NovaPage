import { neon } from "@neondatabase/serverless";

/**
 * Il proxy deve sapere se uno slug esiste prima di lasciar partire lo streaming:
 * è l'unico modo per rispondere 404 davvero (dopo lo shell la risposta è già 200).
 *
 * Per non pagare una query a ogni visualizzazione teniamo in memoria, per
 * istanza, l'esito degli ultimi minuti. Le landing cambiano raramente e uno slug
 * appena pubblicato compare entro un minuto.
 */
const TTL = 60_000;
const MAX = 500;

const cache = new Map<string, { exists: boolean; at: number }>();

export async function publishedSlugExists(slug: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(slug);
  if (hit && now - hit.at < TTL) return hit.exists;

  const url = process.env.DATABASE_URL;
  if (!url) return true; // senza database non blocchiamo nulla: decide la pagina

  try {
    const sql = neon(url);
    const rows = (await sql`
      select 1 as found from sites where slug = ${slug} and published limit 1
    `) as Array<{ found: number }>;
    const exists = rows.length > 0;
    // Solo gli esiti positivi restano in cache: un negativo memorizzato farebbe
    // rispondere 404 alla pagina appena pubblicata, che è il momento peggiore.
    if (exists) {
      if (cache.size >= MAX) cache.clear();
      cache.set(slug, { exists: true, at: now });
    }
    return exists;
  } catch {
    // Database irraggiungibile: meglio far rispondere la pagina che un 404 falso.
    return true;
  }
}
