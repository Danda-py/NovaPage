export const instant = false;
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { getSiteBySlug } from "@/lib/store";
import { isLegalDoc, legalDocContent } from "@/lib/legal-doc";
import { emailConfigured } from "@/lib/email";
import { publicBaseUrl, publicPath, requestHost } from "@/lib/public-url";

type Params = Promise<{ slug: string; doc: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, doc } = await params;
  if (!isLegalDoc(doc)) return { title: "Pagina non trovata · NovaPage", robots: { index: false } };

  const site = await getSiteBySlug(slug);
  if (!site || !site.published) {
    return { title: "Pagina non trovata · NovaPage", robots: { index: false } };
  }

  const content = legalDocContent(doc, site.config, {
    slug: site.slug,
    updatedAt: site.updatedAt,
  });

  const headerBag = await headers();
  const host = requestHost((name) => headerBag.get(name));

  return {
    metadataBase: new URL(publicBaseUrl(site, host)),
    title: `${content.title} · ${site.config.meta.title}`,
    description: content.intro.slice(0, 160),
    alternates: { canonical: publicPath(site, host, `/${doc}`) },
    // Informativa e condizioni si leggono, ma non devono competere in ricerca con la landing.
    robots: { index: false, follow: true },
  };
}

export default async function LegalPage({ params }: { params: Params }) {
  await connection();
  const { slug, doc } = await params;
  if (!isLegalDoc(doc)) notFound();

  const site = await getSiteBySlug(slug);
  if (!site || !site.published) notFound();

  const content = legalDocContent(doc, site.config, {
    slug: site.slug,
    updatedAt: site.updatedAt,
    services: { email: emailConfigured() },
  });
  const accent = site.config.theme.accent_color;
  const headerBag = await headers();
  const host = requestHost((name) => headerBag.get(name));
  const prefix = publicPath(site, host).replace(/\/$/, "");
  const homePath = prefix || "/";

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4">
          <Link href={homePath} className="text-xs text-zinc-400 hover:text-zinc-200">
            ← {site.config.meta.title}
          </Link>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider"
            style={{ background: `${accent}1f`, color: accent }}
          >
            {content.title}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{content.intro}</p>

        <div className="mt-8 space-y-6">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-zinc-300">
                {section.heading}
              </h2>
              <div className="mt-2 space-y-2">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-[13px] leading-relaxed text-zinc-400">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-[11.5px] leading-relaxed text-amber-100/70">
          Testo generato automaticamente dai dati inseriti nella pagina. Chi pubblica deve verificarlo e
          completarlo: non sostituisce una consulenza legale.
        </p>

        <nav className="mt-6 flex flex-wrap gap-3 text-[11.5px] text-zinc-500">
          <Link href={`${prefix}/privacy`} className="hover:text-zinc-300">Privacy</Link>
          <Link href={`${prefix}/cookie`} className="hover:text-zinc-300">Cookie</Link>
          <Link href={`${prefix}/termini`} className="hover:text-zinc-300">Termini</Link>
        </nav>
      </main>
    </div>
  );
}
