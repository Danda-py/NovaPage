import { NextResponse } from "next/server";
import { emailConfigured, leadReplyHtml, sendEmail } from "@/lib/email";
import { findOwnerContact, getLead, markLeadReplied } from "@/lib/store";
import { requireSite } from "@/lib/guard";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

const MAX_BODY = 5000;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    siteId?: string;
    leadId?: string;
    subject?: string;
    text?: string;
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

  const limit = await rateLimit(`lead-reply:${guard.user.id}:${clientIp(req)}`, 40, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });

  const lead = await getLead(body.siteId, body.leadId);
  if (!lead) return NextResponse.json({ error: "Contatto non trovato" }, { status: 404 });
  if (!lead.email) {
    return NextResponse.json(
      { error: "Questo contatto non ha lasciato un'email" },
      { status: 400 },
    );
  }

  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Scrivi il testo della risposta" }, { status: 400 });
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: "Risposta troppo lunga" }, { status: 400 });
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error: "L'invio email non è configurato su questa installazione: usa il link email del tuo client.",
        fallback: true,
      },
      { status: 503 },
    );
  }

  const owner = await findOwnerContact(body.siteId);
  const title = owner?.title ?? guard.site.config.meta.title;
  const subject = (body.subject ?? "").trim().slice(0, 140) || `Re: ${title}`;

  const sent = await sendEmail({
    to: lead.email,
    subject,
    html: leadReplyHtml({ title, body: text, siteEmail: owner?.email ?? guard.user.email }),
    text,
    replyTo: owner?.email,
  });
  if (!sent) {
    return NextResponse.json(
      { error: "Invio non riuscito: riprova tra poco o scrivi dal tuo client email." },
      { status: 502 },
    );
  }

  const updated = await markLeadReplied(body.siteId, body.leadId);
  return NextResponse.json({ ok: true, lead: updated });
}
