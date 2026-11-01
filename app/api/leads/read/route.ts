import { NextResponse } from "next/server";
import { markLeadsRead } from "@/lib/store";
import { requireSite } from "@/lib/guard";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { siteId?: string } | null;
  if (!body?.siteId) return NextResponse.json({ error: "siteId mancante" }, { status: 400 });

  const guard = await requireSite(body.siteId);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }

  const updated = await markLeadsRead(body.siteId);
  return NextResponse.json({ updated });
}
