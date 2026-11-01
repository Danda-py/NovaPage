import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listPublishedSites } from "@/lib/store";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const sites = await listPublishedSites().catch(() => []);

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    ...sites.map((site) => ({
      url: `${base}/s/${site.slug}`,
      lastModified: new Date(site.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
