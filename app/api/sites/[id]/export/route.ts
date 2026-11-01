import { NextResponse } from "next/server";
import { getSite } from "@/lib/store";
import { requireSite } from "@/lib/guard";
import { isHtmlPage, sanitizeHtml } from "@/lib/html";
import { siteReadiness } from "@/lib/readiness";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Esporta la pagina come file: l'HTML vero per le pagine in modalità libera,
 * il JSON del sito per quelle a blocchi. Serve a chi vuole portarsi via il
 * lavoro o continuare altrove.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const guard = await requireSite(id);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "auth" ? "Autenticazione richiesta" : "Sito non trovato" },
      { status: guard.reason === "auth" ? 401 : 404 },
    );
  }

  const site = await getSite(id);
  if (!site) return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });

  const html = isHtmlPage(site.config);
  const body = html
    ? `<!DOCTYPE html>\n<html lang="it">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${site.config.meta.title.replace(/[<>&]/g, "")}</title>\n<meta name="description" content="${site.config.meta.description.replace(/[<>&"]/g, "")}">\n</head>\n<body>\n${sanitizeHtml(site.config.html!)}\n</body>\n</html>\n`
    : JSON.stringify({ config: site.config, readiness: siteReadiness(site.config) }, null, 2);

  return new NextResponse(body, {
    headers: {
      "Content-Type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${site.slug}.${html ? "html" : "json"}"`,
      "Cache-Control": "no-store",
    },
  });
}
