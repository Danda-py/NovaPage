import { NextResponse } from "next/server";
import { requireSite } from "@/lib/guard";
import { listLeads, listLeadsForOwner, listSites } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { leadsToCsv } from "@/lib/csv";

/**
 * Con `siteId` esporta i contatti di una landing; senza, esporta tutti i
 * contatti dell'utente con la colonna del sito di provenienza.
 */
export async function GET(req: Request) {
  const siteId = new URL(req.url).searchParams.get("siteId");

  if (siteId) {
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

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const [sites, leads] = await Promise.all([listSites(user.id), listLeadsForOwner(user.id)]);
  const titles = new Map(sites.map((site) => [site.id, site.config.meta.title]));
  const csv = leadsToCsv(
    leads.map((lead) => ({ ...lead, site: titles.get(lead.siteId) ?? "" })),
    true,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatti-novapage.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
