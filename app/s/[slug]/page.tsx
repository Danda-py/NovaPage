export const instant = false;
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSiteBySlug } from "@/lib/store";
import { siteUrl } from "@/lib/site-url";
import { jsonLdScript, pageDescription, siteJsonLd } from "@/lib/seo";
import { PublicSite } from "@/components/PublicSite";
import { CustomPage } from "@/components/CustomPage";
import { isHtmlPage } from "@/lib/html";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  if (!site) return { title: "Pagina non trovata · NovaPage" };
  if (!site.published) {
    return { title: "Pagina non disponibile · NovaPage", robots: { index: false, follow: false } };
  }

  const title = site.config.meta.title;
  const description = pageDescription(site.config, title);
  const canonical = `/s/${site.slug}`;

  return {
    // Il titolo della landing è l'attività dell'utente: niente suffisso del brand.
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: title,
      locale: "it_IT",
      type: "website",
      images: [{ url: `${canonical}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${canonical}/opengraph-image`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  if (!site || !site.published) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            siteJsonLd({ site: site.config, slug: site.slug, baseUrl: siteUrl() }),
          ),
        }}
      />
      <meta name="theme-color" content={site.config.theme.bg_color} />
      {isHtmlPage(site.config) ? (
        <CustomPage html={site.config.html!} siteId={site.id} />
      ) : (
        <PublicSite site={site.config} siteId={site.id} />
      )}
    </>
  );
}
