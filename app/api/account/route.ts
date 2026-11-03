import { NextResponse } from "next/server";
import { getCurrentUser, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { deleteUser, listSites, logError } from "@/lib/store";
import { collectImageUrls } from "@/lib/images";
import { deleteStoredImages } from "@/lib/storage";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`delete-account:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !(await verifyPassword(body.password, user.salt, user.passwordHash))) {
    return NextResponse.json({ error: "Password non corretta" }, { status: 403 });
  }

  try {
    // Le immagini non sono nel database: vanno raccolte prima che il cascade
    // cancelli i siti, poi rimosse dallo storage dopo l'eliminazione.
    const sites = await listSites(user.id);
    await deleteUser(user.id);
    await deleteStoredImages(sites.flatMap((site) => collectImageUrls(site.config)));
  } catch (error) {
    await logError({ source: "account", message: "Cancellazione account fallita", detail: String(error), userId: user.id });
    return NextResponse.json({ error: "Cancellazione non riuscita, riprova" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...sessionCookieOptions, value: "", maxAge: 0 });
  return res;
}
