import { NextResponse } from "next/server";
import {
  createSessionToken,
  createTwoFactorTicket,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { findUserByEmail } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const perIp = await rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000);
  if (!perIp.ok) {
    return NextResponse.json({ error: tooMany(perIp.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Inserisci email e password" }, { status: 400 });
  }

  const perAccount = await rateLimit(`login:${ip}:${email}`, 10, 15 * 60 * 1000);
  if (!perAccount.ok) {
    return NextResponse.json({ error: tooMany(perAccount.retryAfter) }, { status: 429 });
  }

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.salt, user.passwordHash))) {
    return NextResponse.json({ error: "Email o password non corretti" }, { status: 401 });
  }

  // La password da sola non apre la sessione quando il secondo fattore è attivo:
  // il client riceve un biglietto a vita breve e chiede il codice.
  if (user.twoFactorEnabled) {
    return NextResponse.json({ twoFactor: true, ticket: createTwoFactorTicket(user.id) });
  }

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  res.cookies.set({ ...sessionCookieOptions, value: createSessionToken(user.id, user.sessionVersion) });
  return res;
}
