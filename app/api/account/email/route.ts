import { NextResponse, after } from "next/server";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { emailConfigured, securityEmailHtml, sendEmail } from "@/lib/email";
import { logError, updateUserEmail } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`email:${user.id}:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();

  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "Inserisci un indirizzo email valido" }, { status: 400 });
  }
  if (email === user.email) {
    return NextResponse.json({ error: "È già il tuo indirizzo email" }, { status: 400 });
  }
  if (!body?.password || !(await verifyPassword(body.password, user.salt, user.passwordHash))) {
    return NextResponse.json({ error: "Password non corretta" }, { status: 403 });
  }

  try {
    const result = await updateUserEmail(user.id, email);
    if (result === "taken") {
      return NextResponse.json({ error: "Questa email è già registrata" }, { status: 409 });
    }
    if (result === "missing") {
      return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
    }
  } catch (error) {
    await logError({
      source: "account",
      message: "Cambio email fallito",
      detail: String(error),
      userId: user.id,
    });
    return NextResponse.json({ error: "Aggiornamento non riuscito, riprova" }, { status: 500 });
  }

  // L'avviso va al vecchio indirizzo: è quello che l'utente controlla e che un
  // malintenzionato non possiede più dopo il cambio.
  if (emailConfigured()) {
    after(async () => {
      await sendEmail({
        to: user.email,
        subject: "Email dell'account cambiata su NovaPage",
        html: securityEmailHtml({
          title: "Email dell'account aggiornata",
          body: `L'indirizzo del tuo account NovaPage è passato da ${user.email} a ${email}. Da ora accedi con il nuovo indirizzo.`,
        }),
        text: `L'indirizzo del tuo account NovaPage è passato da ${user.email} a ${email}. Se non sei stato tu, reimposta la password dalla pagina di accesso.`,
      });
    });
  }

  return NextResponse.json({ ok: true, email });
}
