import { after, NextResponse } from "next/server";
import { addLead, deleteLead, findOwnerContact, getSite, listLeads, updateLead } from "@/lib/store";
import { requireSite } from "@/lib/guard";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { emailConfigured, leadNotificationHtml, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";

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

/** Eliminazione di un singolo contatto: è un diritto dell'interessato (GDPR). */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    siteId?: string;
    leadId?: string;
  } | null;
  if (!body?.siteId || !body?.leadId) {
    return NextResponse.json({ error: "siteId e leadId sono obbligatori" }, { status: 400 });
  }

  const guard = await requireSite(body.siteId);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }

  const deleted = await deleteLead(body.siteId, body.leadId);
  if (!deleted) return NextResponse.json({ error: "Contatto non trovato" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** Stato "gestito" e nota privata: solo il titolare del sito può scriverli. */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    siteId?: string;
    leadId?: string;
    handled?: boolean;
    notes?: string;
  } | null;
  if (!body?.siteId || !body?.leadId) {
    return NextResponse.json({ error: "siteId e leadId sono obbligatori" }, { status: 400 });
  }

  const guard = await requireSite(body.siteId);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }

  if (body.notes !== undefined && body.notes.length > 2000) {
    return NextResponse.json({ error: "Nota troppo lunga (max 2000 caratteri)" }, { status: 400 });
  }

  const lead = await updateLead(body.siteId, body.leadId, {
    handled: typeof body.handled === "boolean" ? body.handled : undefined,
    notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
  });
  if (!lead) return NextResponse.json({ error: "Contatto non trovato" }, { status: 404 });
  return NextResponse.json({ lead });
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
    /** Timestamp del montaggio del modulo: un invio istantaneo è un bot. */
    startedAt?: number;
  } | null;

  // Honeypot: i bot compilano il campo nascosto, gli umani no.
  if (body?.website) return NextResponse.json({ ok: true }, { status: 201 });

  // Nessun umano compila un modulo in meno di un secondo e mezzo: rispondiamo
  // "ok" per non dare al bot un segnale, ma il lead non viene salvato.
  if (typeof body?.startedAt === "number" && Date.now() - body.startedAt < 1500) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

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

  // Solo una pagina pubblicata raccoglie contatti: una bozza non ha un modulo
  // raggiungibile e l'endpoint non deve poter riempire la casella del titolare.
  const site = await getSite(body.siteId);
  if (!site || !site.published) {
    return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
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

  // Notifica al titolare dopo la risposta: il visitatore non attende l'invio.
  const siteId = body.siteId;
  if (emailConfigured()) {
    after(async () => {
      const owner = await findOwnerContact(siteId);
      if (!owner) return;
      const at = new Date(lead.createdAt).toLocaleString("it-IT", {
        dateStyle: "short",
        timeStyle: "short",
      });
      await sendEmail({
        to: owner.email,
        subject: `Nuovo contatto per "${owner.title}"`,
        html: leadNotificationHtml({
          title: owner.title,
          url: `${siteUrl()}/sites/${siteId}`,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          message: lead.message,
          at,
        }),
        text: [
          `Nuovo contatto per ${owner.title} (${at})`,
          `Nome: ${lead.name || "—"}`,
          `Email: ${lead.email || "—"}`,
          `Telefono: ${lead.phone || "—"}`,
          "",
          lead.message || "(nessun messaggio)",
          "",
          `${siteUrl()}/sites/${siteId}`,
        ].join("\n"),
      });
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
