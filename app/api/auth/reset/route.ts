import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { consumePasswordReset, updateUserPassword } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = await rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { token?: string; password?: string } | null;
  const token = body?.token?.trim() ?? "";
  const password = body?.password ?? "";

  if (token.length < 32) {
    return NextResponse.json({ error: "Link non valido o scaduto" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La password deve avere almeno 8 caratteri" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const userId = await consumePasswordReset(tokenHash);
  if (!userId) {
    return NextResponse.json({ error: "Link non valido o scaduto" }, { status: 400 });
  }

  const { salt, hash } = await hashPassword(password);
  await updateUserPassword(userId, hash, salt);

  return NextResponse.json({ ok: true });
}
