import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSite } from "@/lib/guard";
import { markSiteDomainVerified } from "@/lib/store";
import { domainRecords, hostPair, verifyDomainDns } from "@/lib/domain";
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
  const verified =
    site.domainVerified ||
    (await verifyDomainDns(site.customDomain, site.customDomainToken ?? ""));

  let updated = site;
  if (verified && !site.domainVerified) {
    updated = (await markSiteDomainVerified(id)) ?? site;
    revalidateTag(`site:${site.slug}`, { expire: 0 });
  }

  let hosted = false;
  let hostingNote = "";
  if (verified) {
    if (!hostingConfigured()) {
      hostingNote =
        "Dominio verificato. Per servirlo manca la configurazione dell'hosting sul server (VERCEL_TOKEN e VERCEL_PROJECT_ID).";
    } else {
      const attach = await attachDomainsToHosting(domainHosts);
      hosted = attach.ok;
      if (!attach.ok) {
        hostingNote = attach.error
          ? `Dominio verificato, ma l'hosting non l'ha accettato: ${attach.error}`
          : "Dominio verificato, ma l'hosting non l'ha ancora registrato.";
      }
    }
  }

  return NextResponse.json({ verified, hosted, hostingNote, records, hosts, site: updated });
}
