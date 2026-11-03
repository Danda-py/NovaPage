import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";
import { emailConfigured, securityEmailHtml, sendEmail } from "@/lib/email";
import {
  bumpSessionVersion,
  consumeEmailChange,
  findUserById,
  logError,
  updateUserEmail,
} from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = await rateLimit(`email-confirm:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (token.length < 32 || token.length > 200) {
    return NextResponse.json({ error: "Link non valido o scaduto" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const change = await consumeEmailChange(tokenHash);
  if (!change) {
    return NextResponse.json({ error: "Link non valido o scaduto" }, { status: 400 });
  }

  const previous = await findUserById(change.userId);
  if (!previous) {
    return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
  }

  try {
    const result = await updateUserEmail(change.userId, change.newEmail);
    if (result === "taken") {
      return NextResponse.json({ error: "Questa email è già registrata" }, { status: 409 });
    }
    if (result === "missing") {
      return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
    }

    // Il cambio di un dato di accesso invalida tutte le sessioni già aperte.
    await bumpSessionVersion(change.userId);

    if (emailConfigured()) {
      after(async () => {
        await sendEmail({
          to: previous.email,
          subject: "Email dell'account cambiata su NovaPage",
          html: securityEmailHtml({
            title: "Email dell'account aggiornata",
            body: `L'indirizzo del tuo account NovaPage è passato da ${previous.email} a ${change.newEmail}. Da ora accedi con il nuovo indirizzo.`,
          }),
          text: `L'indirizzo del tuo account NovaPage è passato da ${previous.email} a ${change.newEmail}. Se non sei stato tu, reimposta subito la password dalla pagina di accesso.`,
        });
      });
    }
  } catch (error) {
    await logError({
      source: "account",
      message: "Conferma cambio email fallita",
      detail: String(error),
      userId: change.userId,
    });
    return NextResponse.json({ error: "Aggiornamento non riuscito, riprova" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, email: change.newEmail });
  res.cookies.set({ ...sessionCookieOptions, value: "", maxAge: 0 });
  return res;
}
