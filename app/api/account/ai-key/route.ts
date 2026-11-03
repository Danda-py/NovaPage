import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setUserGeminiKey } from "@/lib/store";
import { encryptSecret } from "@/lib/secure";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

/**
 * AI Studio emette sia le vecchie chiavi `AIza…` sia le nuove `AQ.…`: lettere,
 * cifre, punti, trattini e underscore.
 */
const KEY = /^[A-Za-z0-9._-]{20,200}$/;

/**
 * Una chiave sbagliata si scoprirebbe solo alla prima generazione, con un errore
 * incomprensibile. Qui si chiede una volta a Google se la chiave esiste.
 */
async function keyAccepted(key: string): Promise<boolean> {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
      headers: { "x-goog-api-key": key },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`ai-key:${user.id}:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { key?: string } | null;
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!KEY.test(key)) {
    return NextResponse.json(
      { error: "Chiave non valida: incolla la chiave completa di Google AI Studio" },
      { status: 400 },
    );
  }

  if (!(await keyAccepted(key))) {
    return NextResponse.json(
      { error: "Google non ha accettato la chiave: controlla di averla copiata per intero" },
      { status: 400 },
    );
  }

  // Nel database resta solo il testo cifrato: nessuna route la restituisce in chiaro.
  await setUserGeminiKey(user.id, encryptSecret(key));
  return NextResponse.json({ ok: true, tail: key.slice(-4) });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  await setUserGeminiKey(user.id, null);
  return NextResponse.json({ ok: true });
}
