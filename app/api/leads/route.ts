import { NextResponse } from "next/server";
import { addLead, listLeads } from "@/lib/store";
import { requireSite } from "@/lib/guard";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET(req: Request) {
  const siteId = new URL(req.url).searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId mancante" }, { status: 400 });

  const guard = await requireSite(siteId);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }
  return NextResponse.json({ leads: await listLeads(siteId) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    siteId?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    website?: string;
    consent?: boolean;
  } | null;

  // Honeypot: i bot compilano il campo nascosto, gli umani no.
  if (body?.website) return NextResponse.json({ ok: true }, { status: 201 });

  if (!body?.siteId || !(body.name?.trim() || body.email?.trim() || body.phone?.trim())) {
    return NextResponse.json({ error: "Inserisci almeno un recapito" }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Serve il consenso al trattamento dei dati per inviare il modulo" },
      { status: 400 },
    );
  }

  const limit = await rateLimit(`lead:${clientIp(req)}:${body.siteId}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const email = (body.email ?? "").trim();
  if (email && !EMAIL.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (body.message && body.message.length > 1000) {
    return NextResponse.json({ error: "Messaggio troppo lungo (max 1000 caratteri)" }, { status: 400 });
  }

  const lead = await addLead(body.siteId, {
    name: (body.name ?? "").trim(),
    email,
    phone: (body.phone ?? "").trim(),
    message: (body.message ?? "").trim(),
  });
  if (!lead) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
