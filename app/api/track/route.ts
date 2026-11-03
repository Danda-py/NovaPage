import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { trackClick, trackView } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Visitatore unico senza storage sul dispositivo: hash salato di IP e giorno.
 * Cambia ogni giorno e non permette di risalire alla persona.
 */
function visitFingerprint(req: Request): string {
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT ?? "novapage";
  return createHash("sha256").update(`${salt}|${day}|${clientIp(req)}`).digest("hex").slice(0, 24);
}

/**
 * I crawler non sono visite: senza questo filtro i numeri delle statistiche
 * raccontano i bot di Google e i monitor di uptime, non i clienti.
 */
// `WhatsApp`, `Telegram` e `Slack` compaiono anche nei browser in-app di persone
// reali: escluderli falsava le statistiche proprio per chi arriva da un link
// condiviso. Restano fuori solo crawler e anteprime social.
const BOT =
  /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor|uptime|facebookexternalhit|discordbot|linkedinbot|pinterest/i;

function isBot(req: Request): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  return !ua || BOT.test(ua);
}

export async function POST(req: Request) {
  if (isBot(req)) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => null)) as {
    siteId?: string;
    label?: string;
  } | null;
  const siteId = typeof body?.siteId === "string" ? body.siteId : "";
  if (!siteId) return NextResponse.json({ error: "siteId mancante" }, { status: 400 });

  // Il limite è per sito oltre che per IP: una raffica non deve gonfiare le
  // statistiche di tutte le pagine contemporaneamente.
  const limit = await rateLimit(`track:${clientIp(req)}:${siteId}`, 60, 60 * 1000);
  if (!limit.ok) return NextResponse.json({ ok: true });

  const label = typeof body?.label === "string" ? body.label : "";
  const ok = label
    ? await trackClick(siteId, label)
    : await trackView(siteId, visitFingerprint(req));
  if (!ok) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
