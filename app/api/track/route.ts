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

export async function POST(req: Request) {
  const limit = await rateLimit(`track:${clientIp(req)}`, 120, 60 * 1000);
  if (!limit.ok) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => null)) as {
    siteId?: string;
    label?: string;
    visitorId?: string;
  } | null;
  if (!body?.siteId) return NextResponse.json({ error: "siteId mancante" }, { status: 400 });

  const ok = body.label
    ? await trackClick(body.siteId, body.label)
    : await trackView(body.siteId, visitFingerprint(req));
  if (!ok) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
