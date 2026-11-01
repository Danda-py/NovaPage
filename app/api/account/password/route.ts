import { NextResponse, after } from "next/server";
import {
  createSessionToken,
  getCurrentUser,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { updateUserPassword } from "@/lib/store";
import { emailConfigured, securityEmailHtml, sendEmail } from "@/lib/email";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`password:${user.id}:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { current?: string; next?: string } | null;
  const current = body?.current ?? "";
  const next = body?.next ?? "";

  if (!(await verifyPassword(current, user.salt, user.passwordHash))) {
    return NextResponse.json({ error: "Password attuale non corretta" }, { status: 403 });
  }
  if (next.length < 8) {
    return NextResponse.json(
      { error: "La nuova password deve avere almeno 8 caratteri" },
      { status: 400 },
    );
  }
  if (next === current) {
    return NextResponse.json(
      { error: "La nuova password deve essere diversa da quella attuale" },
      { status: 400 },
    );
  }

  const { salt, hash } = await hashPassword(next);
  await updateUserPassword(user.id, hash, salt);

  // Avviso all'indirizzo attuale: se il cambio non è suo, deve accorgersene.
  if (emailConfigured()) {
    after(async () => {
      await sendEmail({
        to: user.email,
        subject: "Password aggiornata su NovaPage",
        html: securityEmailHtml({
          title: "Password aggiornata",
          body: `La password del tuo account ${user.email} è stata cambiata poco fa. Tutte le altre sessioni sono state disconnesse.`,
        }),
        text: `La password del tuo account ${user.email} è stata cambiata poco fa. Se non sei stato tu, reimposta la password dalla pagina di accesso.`,
      });
    });
  }

  // updateUserPassword incrementa session_version: senza rinnovo questa sessione
  // (e tutte le altre) verrebbe disconnessa immediatamente.
  const version = user.sessionVersion + 1;
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...sessionCookieOptions, value: createSessionToken(user.id, version) });
  return res;
}
