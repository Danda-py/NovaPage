import { NextResponse } from "next/server";
import {
  createSessionToken,
  readTwoFactorTicket,
  sessionCookieOptions,
} from "@/lib/auth";
import { consumeTwoFactorRecovery, findUserById } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { hashRecoveryCode, verifyTotp } from "@/lib/twofactor";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const perIp = await rateLimit(`2fa-ip:${ip}`, 20, 15 * 60 * 1000);
  if (!perIp.ok) {
    return NextResponse.json({ error: tooMany(perIp.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { ticket?: string; code?: string } | null;
  const userId = readTwoFactorTicket(body?.ticket);
  if (!userId) {
    return NextResponse.json({ error: "Sessione scaduta: accedi di nuovo" }, { status: 401 });
  }

  const perUser = await rateLimit(`2fa-user:${ip}:${userId}`, 10, 15 * 60 * 1000);
  if (!perUser.ok) {
    return NextResponse.json({ error: tooMany(perUser.retryAfter) }, { status: 429 });
  }

  const user = await findUserById(userId);
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: "Verifica non disponibile: accedi di nuovo" }, { status: 401 });
  }

  const code = (body?.code ?? "").trim();
  if (!code) return NextResponse.json({ error: "Inserisci il codice" }, { status: 400 });

  // Sei cifre sono un codice dell'app; altrimenti può essere un codice di recupero,
  // che vale una volta sola e viene rimosso dal database solo se corrisponde.
  const fromApp = /^\d{6}$/.test(code.replace(/\s+/g, ""));
  const valid = fromApp
    ? verifyTotp(user.twoFactorSecret, code)
    : await consumeTwoFactorRecovery(user.id, hashRecoveryCode(code));

  if (!valid) {
    return NextResponse.json({ error: "Codice non valido" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  res.cookies.set({
    ...sessionCookieOptions,
    value: createSessionToken(user.id, user.sessionVersion),
  });
  return res;
}
