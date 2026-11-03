import { siteUrl } from "./site-url";

type SiteWithDomain = {
  slug: string;
  customDomain?: string;
  customDomainAlias?: string;
  domainVerified: boolean;
};

/**
 * Host della richiesta corrente, senza porta e in minuscolo. Su Vercel l'host
 * originale arriva in `x-forwarded-host`; in locale in `host`.
 */
export function requestHost(get: (name: string) => string | null): string {
  const forwarded = get("x-forwarded-host")?.split(",")[0]?.trim();
  return (forwarded || get("host") || "").split(":")[0].toLowerCase();
}

/** La richiesta sta servendo il sito sul suo dominio, non sul percorso /s/. */
export function isCustomDomainRequest(site: SiteWithDomain, host: string): boolean {
  if (!site.domainVerified || !host) return false;
  return [site.customDomain, site.customDomainAlias]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase() === host);
}

/**
 * Base assoluta della pagina. Il dominio del cliente è il suo indirizzo
 * canonico: non va sostituito con quello della piattaforma nei metadati.
 */
export function publicBaseUrl(site: SiteWithDomain, host: string): string {
  return isCustomDomainRequest(site, host) ? `https://${host}` : siteUrl();
}

/** Percorso pubblico della landing o di una sua pagina legale. */
export function publicPath(site: SiteWithDomain, host: string, suffix = ""): string {
  const clean = suffix.startsWith("/") ? suffix : suffix ? `/${suffix}` : "";
  return isCustomDomainRequest(site, host) ? clean || "/" : `/s/${site.slug}${clean}`;
}
