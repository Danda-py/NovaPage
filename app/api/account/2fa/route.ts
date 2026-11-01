import { NextResponse } from "next/server";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import {
  disableTwoFactor,
  enableTwoFactor,
  setTwoFactorSecret,
} from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "@/lib/twofactor";

const WINDOW = 60 * 60 * 1000;

/** Attivazione in due passi: prima si genera il segreto, poi si conferma un codice. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`2fa-setup:${user.id}:${clientIp(req)}`, 10, WINDOW);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA già attiva" }, { status: 409 });
  }

  const secret = generateTotpSecret();
  await setTwoFactorSecret(user.id, secret);
  return NextResponse.json({ secret, otpauth: otpauthUri(user.email, secret) });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`2fa-confirm:${user.id}:${clientIp(req)}`, 10, WINDOW);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code ?? "";
  if (!user.twoFactorSecret) {
    return NextResponse.json(
      { error: "Attivazione non avviata: ricarica la pagina" },
      { status: 400 },
    );
  }
  if (!verifyTotp(user.twoFactorSecret, code)) {
    return NextResponse.json({ error: "Codice non valido" }, { status: 400 });
  }

  // I codici in chiaro escono una sola volta: nel database restano solo gli hash.
  const recovery = generateRecoveryCodes();
  await enableTwoFactor(user.id, recovery.map(hashRecoveryCode));
  return NextResponse.json({ ok: true, recovery });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`2fa-disable:${user.id}:${clientIp(req)}`, 10, WINDOW);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";
  // Disattivare il secondo fattore è una riduzione di sicurezza: serve la password.
  if (!(await verifyPassword(password, user.salt, user.passwordHash))) {
    return NextResponse.json({ error: "Password non corretta" }, { status: 401 });
  }

  await disableTwoFactor(user.id);
  return NextResponse.json({ ok: true });
}
