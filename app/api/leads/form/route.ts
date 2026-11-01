import { after, NextResponse } from "next/server";
import { addLead, findOwnerContact, getSiteBySlug } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { emailConfigured, leadNotificationHtml, leadThankYouHtml, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";
import { encodeLeadCookie, LEAD_COOKIE, parseLeadSubmission } from "@/lib/lead-form";
import { platformHost } from "@/lib/domain";

/**
 * Modulo contatti delle pagine in HTML libero.
 *
 * Un `<form method="post">` non manda JSON: qui si accettano dati form-encoded,
 * si salvano come gli altri contatti e si torna alla pagina con un esito in
 * query string. I valori compilati restano in un cookie httpOnly per dieci
 * minuti, così un errore non li fa perdere.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const get = (key: string) => String(form?.get(key) ?? "").trim();
  // Lo slug torna nel redirect: solo la forma che generiamo noi, mai percorsi liberi.
  const rawSlug = get("slug").slice(0, 60);
  const slug = /^[a-z0-9][a-z0-9-]*$/i.test(rawSlug) ? rawSlug : "";

  // Su un dominio personalizzato la pagina sta alla radice, non sotto /s/: tornare
  // a /s/{slug} mostrerebbe un indirizzo della piattaforma (e un 404).
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  // Anteprime e sviluppo restano sulla piattaforma: solo un dominio del cliente
  // serve la pagina alla radice.
  const onPlatform =
    !host ||
    host === platformHost() ||
    host.endsWith(".vercel.app") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1";

  const back = (state: string, keepValues: boolean, values = "") => {
    const target = slug ? `${onPlatform ? `/s/${slug}` : "/"}?contatto=${state}` : "/";
    const res = NextResponse.redirect(new URL(target, req.url), 303);
    res.cookies.set({
      name: LEAD_COOKIE,
      value: keepValues ? values : "",
      path: "/",
      maxAge: keepValues ? 600 : 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  };

  if (!slug) return back("errore", false);

  // Honeypot: un campo nascosto che solo i bot compilano.
  if (get("website")) return back("inviato", false);

  const site = await getSiteBySlug(slug);
  if (!site || !site.published) return NextResponse.redirect(new URL("/", req.url), 303);

  const submission = parseLeadSubmission(get);
  if (!submission.ok) return back(submission.state, true, encodeLeadCookie(submission.values));

  const limit = await rateLimit(`leadform:${clientIp(req)}:${site.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return back("limite", true, encodeLeadCookie(submission.values));

  const lead = await addLead(site.id, {
    name: submission.values.name ?? "",
    email: submission.values.email ?? "",
    phone: submission.values.phone ?? "",
    message: submission.values.message ?? "",
  });
  if (!lead) return back("errore", true, encodeLeadCookie(submission.values));

  if (emailConfigured()) {
    const siteId = site.id;
    const pageUrl = `${siteUrl()}/s/${site.slug}`;
    const visitorEmail = lead.email;
    after(async () => {
      const owner = await findOwnerContact(siteId);
      const at = new Date(lead.createdAt).toLocaleString("it-IT", {
        dateStyle: "short",
        timeStyle: "short",
      });

      if (owner) {
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
      }

      if (visitorEmail && owner) {
        await sendEmail({
          to: visitorEmail,
          subject: `Messaggio ricevuto — ${owner.title}`,
          html: leadThankYouHtml({ title: owner.title, url: pageUrl, name: lead.name }),
          text: `La tua richiesta è arrivata a ${owner.title}. Ti risponderemo ai recapiti indicati.\n${pageUrl}`,
        });
      }
    });
  }

  return back("inviato", false);
}
