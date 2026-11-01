import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getChat, listLeadsForOwner, listSites } from "@/lib/store";

/** Portabilità dei dati (GDPR art. 20): tutto ciò che l'utente ha creato, in un file. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const [sites, leads] = await Promise.all([listSites(user.id), listLeadsForOwner(user.id)]);
  const chats = await Promise.all(
    sites.map(async (site) => ({
      siteId: site.id,
      slug: site.slug,
      messages: await getChat(site.id),
    })),
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      email: user.email,
      createdAt: user.createdAt,
      termsAcceptedAt: user.termsAcceptedAt,
    },
    sites: sites.map((site) => ({
      id: site.id,
      slug: site.slug,
      published: site.published,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      config: site.config,
    })),
    leads,
    chats,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="novapage-dati-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
