import { siteUrl } from "./site-url";

/**
 * Host della piattaforma, senza schema e senza porta: serve a rifiutare i
 * domini che appartengono già a NovaPage.
 */
export function platformHost(): string {
  try {
    return new URL(siteUrl()).hostname.toLowerCase();
  } catch {
    return "localhost";
  }
}

/**
 * Record che il dominio deve avere per servire la pagina. Sono quelli del
 * hosting (Vercel): un CNAME all'apex non è ammesso dalle regole DNS, quindi
 * l'apex usa un record A. Sovrascrivibili da ambiente se cambia l'hosting.
 */
export const HOSTING_A_RECORD = process.env.HOSTING_A_RECORD?.trim() || "76.76.21.21";
export const HOSTING_CNAME_TARGET =
  process.env.HOSTING_CNAME_TARGET?.trim() || "cname.vercel-dns.com";

/**
 * Prende quello che l'utente incolla (URL completo, con slash o maiuscole) e
 * restituisce solo l'hostname, oppure null. Niente porte, percorsi, IP o spazi:
 * un dominio strano non deve mai finire in un record DNS o in un link.
 */
export function normalizeDomain(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.replace(/\/+$/, "");
  if (value.includes("/") || value.includes("?") || value.includes("#")) return null;
  if (value.includes(":") || value.includes("@") || /\s/.test(value)) return null;
  if (value.endsWith(".")) value = value.slice(0, -1);
  if (!value || value.length > 253) return null;

  const labels = value.split(".");
  if (labels.length < 2) return null;
  for (const label of labels) {
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) return null;
  }
  // Un TLD numerico è un indirizzo IP, non un dominio.
  if (/^\d+$/.test(labels[labels.length - 1])) return null;

  return value;
}

/**
 * `www.novapage.site` e `novapage.site` sono la stessa piattaforma: senza questo
 * confronto la home con il www verrebbe presa per un dominio di un cliente.
 */
export function isPlatformHost(host: string, platform: string): boolean {
  if (!host || !platform) return false;
  const bare = (name: string) => name.toLowerCase().replace(/^www\./, "");
  return host.toLowerCase() === platform.toLowerCase() || bare(host) === bare(platform);
}

/** L'apex di un nome: `www.miosito.it` → `miosito.it`. */
export function apexOf(domain: string): string {
  return domain.startsWith("www.") ? domain.slice(4) : domain;
}

/**
 * I due nomi che devono rispondere con la stessa pagina. Chi collega
 * `miosito.it` si aspetta che funzioni anche `www.miosito.it` (e viceversa).
 */
export function hostPair(domain: string): { primary: string; alias: string } {
  const apex = apexOf(domain);
  return domain.startsWith("www.")
    ? { primary: domain, alias: apex }
    : { primary: domain, alias: `www.${domain}` };
}

export type DnsRecord = { host: string; type: "A" | "CNAME"; name: string; value: string };

export type DomainRecords = {
  /** TXT che dimostra la proprietà del dominio. */
  txtName: string;
  txtValue: string;
  /** I nomi serviti dalla pagina: primario e alias. */
  hosts: string[];
  /** Record di traffico da creare: A per l'apex, CNAME per il www. */
  dns: DnsRecord[];
};

/** I record che l'utente deve creare: uno dimostra la proprietà, gli altri portano il traffico. */
export function domainRecords(domain: string, token: string): DomainRecords {
  const { primary, alias } = hostPair(domain);
  const apex = apexOf(domain);
  const recordFor = (host: string): DnsRecord =>
    host.startsWith("www.")
      ? { host, type: "CNAME", name: host, value: HOSTING_CNAME_TARGET }
      : { host, type: "A", name: host, value: HOSTING_A_RECORD };

  return {
    txtName: `_novapage.${apex}`,
    txtValue: `novapage-verify=${token}`,
    hosts: [primary, alias],
    dns: [recordFor(primary), recordFor(alias)],
  };
}

/**
 * La proprietà del dominio si dimostra solo con il TXT dedicato. Un record A o
 * CNAME già puntato all'hosting non basta: un dominio ospitato lì in passato
 * potrebbe essere collegato senza che chi lo richiede ne sia il titolare.
 * Gli errori DNS sono "non ancora pronto", non un errore dell'utente.
 */
export async function verifyDomainOwnership(domain: string, token: string): Promise<boolean> {
  const records = domainRecords(domain, token);

  try {
    const dns = await import("node:dns/promises");

    // Il TXT può stare sull'apex o sul nome completo, secondo come l'utente l'ha creato.
    for (const name of new Set([records.txtName, `_novapage.${domain}`])) {
      const txt = await dns.resolveTxt(name).catch(() => [] as string[][]);
      if (txt.some((chunks) => chunks.join("").includes(records.txtValue))) return true;
    }

    return false;
  } catch {
    return false;
  }
}
