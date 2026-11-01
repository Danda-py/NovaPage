import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSlugAvailable, slugify } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`check-slug:${clientIp(req)}`, 60, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: tooMany(limit.retryAfter) }, { status: 429 });
  }

  const params = new URL(req.url).searchParams;
  const raw = (params.get("slug") ?? "").slice(0, 60);
  const siteId = params.get("siteId") ?? undefined;
  if (!raw.trim()) return NextResponse.json({ slug: "", available: false });

  const slug = slugify(raw);
  // La pagina stessa non deve risultare "occupata" dal proprio indirizzo.
  const available = await isSlugAvailable(slug, siteId || undefined);
  return NextResponse.json({ slug, available });
}
