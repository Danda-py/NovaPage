export const instant = false;
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSiteBySlug } from "@/lib/store";
import { PublicSite } from "@/components/PublicSite";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  if (!site) return { title: "Pagina non trovata · NovaPage" };

  const title = site.config.meta.title;
  const description =
    site.config.meta.description ||
    `${title}: contatti, informazioni e link utili in una pagina sola.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", locale: "it_IT" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  if (!site) notFound();

  return <PublicSite site={site.config} siteId={site.id} />;
}
