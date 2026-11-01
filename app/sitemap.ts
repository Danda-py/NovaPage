import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listPublishedSites, logError } from "@/lib/store";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  // Se la lettura fallisce la sitemap resta valida, ma l'errore va registrato:
  // un `.catch` silenzioso nasconderebbe una migrazione mancante.
  const sites = await listPublishedSites().catch(async (error) => {
    await logError({
      source: "sitemap",
      message: "Lettura delle pagine pubblicate fallita",
      detail: String(error),
    });
    return [];
  });

  const marketing: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/termini`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookie`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Solo le landing pubblicate: le bozze rispondono 404 e non vanno dichiarate.
  return [
    ...marketing,
    ...sites.map((site) => ({
      url: `${base}/s/${site.slug}`,
      lastModified: new Date(site.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
