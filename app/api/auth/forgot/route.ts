import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createPasswordReset, findUserByEmail, logError } from "@/lib/store";
import { emailConfigured, resetEmailHtml, sendEmail } from "@/lib/email";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site-url";

export async function POST(req: Request) {
  const limit = await rateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!email) return NextResponse.json({ error: "Inserisci la tua email" }, { status: 400 });

  if (!emailConfigured()) {
    await logError({
      source: "auth",
      message: "Reset password richiesto ma email non configurata",
      detail: "Imposta RESEND_API_KEY e EMAIL_FROM",
    });
    return NextResponse.json(
      { ok: true, delivered: false, reason: "unconfigured", note: "Invio email non configurato su questa installazione." },
      { status: 200 },
    );
  }

  const user = await findUserByEmail(email);
  // La risposta resta identica per indirizzi registrati e non registrati: non
  // riveliamo quali email hanno un account. Un invio fallito viene registrato
  // in error_logs da sendEmail, non restituito al client.
  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await createPasswordReset(user.id, tokenHash, expiresAt);

    // Link costruito sull'URL pubblico configurato, mai sull'header Origin della
    // richiesta: altrimenti chi chiama l'endpoint può dirottare il token.
    const link = `${siteUrl()}/reset?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Reimposta la password di NovaPage",
      html: resetEmailHtml(link),
      text: `Reimposta la password: ${link} (valido un'ora)`,
    });
  }

  return NextResponse.json({ ok: true, delivered: true });
}
