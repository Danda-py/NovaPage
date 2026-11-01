import { NextResponse } from "next/server";
import { requireSite } from "@/lib/guard";
import { listLeads } from "@/lib/store";
import { leadsToCsv } from "@/lib/csv";

export async function GET(req: Request) {
  const siteId = new URL(req.url).searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId mancante" }, { status: 400 });

  const guard = await requireSite(siteId);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }

  const csv = leadsToCsv(await listLeads(siteId));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatti-${guard.site.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
