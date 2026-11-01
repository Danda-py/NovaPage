import { cacheLife, cacheTag } from "next/cache";
import { getSiteBySlug, type StoredSite } from "./store";

/**
 * La landing pubblica viene letta a ogni visita: la query entra nella cache di
 * Next con un tag per slug. Salvataggio, rinomina e cambio di pubblicazione
 * invalidano il tag, quindi il contenuto resta aggiornato senza aspettare.
 *
 * La risposta HTML resta comunque dinamica: la pagina legge i cookie per
 * ripristinare i valori del modulo dopo un errore, quindi non è cacheabile
 * come documento condiviso.
 */
export async function loadPublishedSite(slug: string): Promise<StoredSite | null> {
  "use cache";
  cacheTag(`site:${slug}`);
  cacheLife("minutes");
  return getSiteBySlug(slug);
}
