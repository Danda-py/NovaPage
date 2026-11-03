import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSite } from "@/lib/guard";
import { markSiteDomainVerified } from "@/lib/store";
import { domainRecords, hostPair, verifyDomainOwnership } from "@/lib/domain";
import { attachDomainsToHosting, hostingConfigured } from "@/lib/hosting";
import { rateLimit, tooMany } from "@/lib/rate-limit";

// Il controllo DNS usa `node:dns`, quindi questa route resta sul runtime Node
// (quello predefinito): nessuna dichiarazione esplicita, vietata con cacheComponents.

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }

  const limit = await rateLimit(`domain-verify:${guard.user.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const site = guard.site;
  if (!site.customDomain) {
    return NextResponse.json({ error: "Nessun dominio collegato" }, { status: 400 });
  }

  const records = domainRecords(site.customDomain, site.customDomainToken ?? "");
  const hosts = hostPair(site.customDomain);
  // Si aggancia anche l'eventuale alias già salvato, oltre alla coppia canonica.
  const domainHosts = [...new Set([site.customDomain, site.customDomainAlias, hosts.alias])].filter(
    (value): value is string => Boolean(value),
  );

  // La proprietà (TXT) si verifica una volta sola; l'aggancio all'hosting si
  // ritenta a ogni clic, così un errore temporaneo dell'API non resta bloccato.
  const ownershipVerified =
    site.domainVerified ||
    (await verifyDomainOwnership(site.customDomain, site.customDomainToken ?? ""));

  let hosted = false;
  let hostingNote = "";
  let active = site.domainVerified;

  if (ownershipVerified) {
    if (!hostingConfigured()) {
      // Senza credenziali non possiamo agganciare il dominio: il TXT però è una
      // prova valida e l'utente non deve poter fare altro da qui.
      active = true;
      hostingNote =
        "Dominio verificato. Per servirlo manca la configurazione dell'hosting sul server (VERCEL_TOKEN e VERCEL_PROJECT_ID).";
    } else {
      const attach = await attachDomainsToHosting(domainHosts);
      hosted = attach.ok;
      // Un dominio già verificato resta attivo anche se l'hosting è momentaneamente
      // irraggiungibile: il fallimento non deve spegnere una pagina che funziona.
      active = site.domainVerified || attach.ok;
      if (!attach.ok) {
        hostingNote = attach.error
          ? `Proprietà verificata, ma l'hosting non ha accettato il dominio: ${attach.error}`
          : "Proprietà verificata, ma l'hosting non ha ancora registrato il dominio.";
      }
    }
  }

  // Solo dopo l'aggancio il dominio diventa attivo nel database: se l'hosting
  // fallisce non deve risultare verificato e servire una pagina che non esiste.
  let updated = site;
  if (active && !site.domainVerified) {
    updated = (await markSiteDomainVerified(id)) ?? site;
    revalidateTag(`site:${site.slug}`, { expire: 0 });
  }

  return NextResponse.json({
    verified: active,
    ownershipVerified,
    hosted,
    hostingNote,
    records,
    hosts,
    site: updated,
  });
}
