import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSite } from "@/lib/guard";
import { findSiteIdByDomain, setSiteCustomDomain } from "@/lib/store";
import { domainRecords, hostPair, normalizeDomain, platformHost } from "@/lib/domain";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }

  const limit = await rateLimit(`domain:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { domain?: unknown } | null;
  if (!body || !("domain" in body)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  // Rimozione esplicita: si perde anche il token di verifica.
  if (body.domain === null) {
    const site = await setSiteCustomDomain(id, null);
    if (!site) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
    revalidateTag(`site:${site.slug}`, { expire: 0 });
    return NextResponse.json({ site, records: null });
  }

  const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");
  if (!domain) {
    return NextResponse.json(
      { error: "Dominio non valido: usa un nome come www.miosito.it" },
      { status: 400 },
    );
  }

  const host = platformHost();
  const pair = hostPair(domain);
  // Anche l'alias appartiene alla piattaforma se lo è il dominio principale.
  if ([pair.primary, pair.alias].some((name) => name === host || name.endsWith(`.${host}`))) {
    return NextResponse.json(
      { error: "Usa un dominio tuo: questo appartiene a NovaPage" },
      { status: 400 },
    );
  }

  // Controllo su entrambi i nomi: apex e www possono essere occupati anche da pagine diverse.
  for (const name of [pair.primary, pair.alias]) {
    const owner = await findSiteIdByDomain(name);
    if (owner && owner !== id) {
      return NextResponse.json(
        { error: "Questo dominio è già collegato a un'altra pagina" },
        { status: 409 },
      );
    }
  }

  const token = randomBytes(16).toString("hex");
  try {
    const site = await setSiteCustomDomain(id, pair.primary, token, pair.alias);
    if (!site) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
    revalidateTag(`site:${site.slug}`, { expire: 0 });
    // Se il dominio era già lo stesso, `setSiteCustomDomain` conserva il token
    // esistente: restituire quello nuovo (mai salvato) farebbe fallire la verifica.
    return NextResponse.json({
      site,
      records: domainRecords(pair.primary, site.customDomainToken ?? token),
    });
  } catch (error) {
    // Un dominio in attesa su un'altra pagina non è visibile alla lettura
    // (considera solo i verificati), ma il vincolo unique lo blocca comunque.
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Questo dominio è già collegato a un'altra pagina" },
        { status: 409 },
      );
    }
    throw error;
  }
}
