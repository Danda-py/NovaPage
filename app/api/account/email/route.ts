import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { emailChangeHtml, emailConfigured, sendEmail } from "@/lib/email";
import { createEmailChange, findUserByEmail, logError } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site-url";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`email:${user.id}:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "Inserisci un indirizzo email valido" }, { status: 400 });
  }
  if (email === user.email) {
    return NextResponse.json({ error: "È già il tuo indirizzo email" }, { status: 400 });
  }
  if (!password || !(await verifyPassword(password, user.salt, user.passwordHash))) {
    return NextResponse.json({ error: "Password non corretta" }, { status: 403 });
  }
  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Il cambio email richiede l'invio di un link di conferma: configura RESEND_API_KEY e EMAIL_FROM.",
      },
      { status: 503 },
    );
  }

  const existing = await findUserByEmail(email);
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "Questa email è già registrata" }, { status: 409 });
  }

  try {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await createEmailChange(user.id, email, tokenHash, new Date(Date.now() + 60 * 60 * 1000));

    const link = `${siteUrl()}/conferma-email?token=${token}`;
    const sent = await sendEmail({
      to: email,
      subject: "Conferma il nuovo indirizzo di NovaPage",
      html: emailChangeHtml(link, email),
      text: `Conferma il nuovo indirizzo del tuo account NovaPage: ${link} (valido un'ora). Se non hai richiesto il cambio, ignora questa email.`,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Non sono riuscito a inviare il link di conferma: riprova tra poco." },
        { status: 502 },
      );
    }
  } catch (error) {
    await logError({
      source: "account",
      message: "Richiesta cambio email fallita",
      detail: String(error),
      userId: user.id,
    });
    return NextResponse.json({ error: "Aggiornamento non riuscito, riprova" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pending: true, email });
}
