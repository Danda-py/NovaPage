import { neon } from "@neondatabase/serverless";

/**
 * Il proxy deve sapere se uno slug esiste prima di lasciar partire lo streaming:
 * è l'unico modo per rispondere 404 davvero (dopo lo shell la risposta è già 200).
 *
 * Per non pagare una query a ogni visualizzazione teniamo in memoria, per
 * istanza, l'esito per pochi secondi. La finestra è volutamente corta: se una
 * pagina passa a bozza, finché il proxy la considera pubblicata la richiesta
 * arriva alla pagina, che risponde con il contenuto 404 ma con stato 200.
 */
const TTL = 15_000;
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
