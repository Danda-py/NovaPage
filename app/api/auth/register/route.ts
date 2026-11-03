import { NextResponse } from "next/server";
import { createSessionToken, hashPassword, sessionCookieOptions } from "@/lib/auth";
import { claimLegacySites, createUser } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
    acceptTerms?: boolean;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (body?.acceptTerms !== true) {
    return NextResponse.json(
      { error: "Devi accettare i Termini di servizio per creare un account" },
      { status: 400 },
    );
  }

  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La password deve avere almeno 8 caratteri" }, { status: 400 });
  }

  const { salt, hash } = await hashPassword(password);
  const user = await createUser({ email, passwordHash: hash, salt, termsAccepted: true });
  if (!user) {
    return NextResponse.json({ error: "Esiste già un account con questa email" }, { status: 409 });
  }

  // Assegnazione dei siti creati prima degli account: è una migrazione una-tantum,
  // non deve assegnare a ogni nuovo iscritto i siti rimasti senza proprietario.
  if (process.env.CLAIM_LEGACY_SITES === "1") {
    await claimLegacySites(user.id);
  }

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } }, { status: 201 });
  res.cookies.set({ ...sessionCookieOptions, value: createSessionToken(user.id, user.sessionVersion) });
  return res;
}
