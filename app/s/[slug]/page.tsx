export const instant = false;
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { loadPublishedSite } from "@/lib/public-site";
import { siteUrl } from "@/lib/site-url";
import { jsonLdScript, pageDescription, siteJsonLd } from "@/lib/seo";
import { SitePreview } from "@/components/SitePreview";
import { SiteTracker } from "@/components/SiteTracker";
import { CustomPage } from "@/components/CustomPage";
import { SiteBadge } from "@/components/SiteBadge";
import { SiteLegalLinks } from "@/components/SiteLegalLinks";
import {
  htmlPalette,
  injectLeadForm,
  injectLeadValues,
  injectLegalLinks,
  isHtmlPage,
  isLightColor,
  optimizeImages,
  sanitizeHtml,
} from "@/lib/html";
import { decodeLeadCookie, LEAD_COOKIE } from "@/lib/lead-form";

/**
 * Metadata, viewport e pagina chiedono lo stesso sito: il loader è cacheato per
 * slug (invalidato al salvataggio), quindi la richiesta non ripete la query.
 */
const loadSite = loadPublishedSite;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite(slug);
  // Qui la risposta non è ancora partita: dichiarare il 404 nei metadati è
  // l'ultimo punto in cui lo stato HTTP è ancora decidibile.
  if (!site) notFound();
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

/** Colore della barra del browser preso dal tema della landing, con override del layout. */
export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const site = await loadSite(slug).catch(() => null);
  if (!site?.published) return { themeColor: "#09090b" };
  const palette = isHtmlPage(site.config) ? htmlPalette(site.config.html ?? "") : {};
  return { themeColor: palette.bg ?? site.config.theme.bg_color };
}

/** Esito del modulo contatti: arriva in query string dopo il redirect del POST. */
const CONTACT_STATES: Record<string, string> = {
  inviato: "Messaggio inviato. Ti risponderemo al più presto.",
  consenso: "Serve il consenso al trattamento dei dati per inviare il modulo.",
  recapiti: "Inserisci almeno un recapito, email o telefono.",
  email: "L'indirizzo email non è valido.",
  limite: "Troppi invii in poco tempo: riprova tra qualche minuto.",
  errore: "Invio non riuscito: riprova.",
};

function ContactNotice({ state }: { state: string }) {
  const text = CONTACT_STATES[state];
  if (!text) return null;
  const ok = state === "inviato";

  return (
    <div
      role="status"
      className={`fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-[12.5px] shadow-2xl backdrop-blur-md ${
        ok
          ? "border-emerald-500/40 bg-emerald-950/85 text-emerald-100"
          : "border-amber-500/40 bg-amber-950/85 text-amber-100"
      }`}
    >
      {text}
    </div>
  );
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ contatto?: string }>;
}) {
  await connection();
  const { slug } = await params;
  const { contatto } = await searchParams;
  const site = await loadSite(slug);
  if (!site || !site.published) notFound();

  const custom = isHtmlPage(site.config);
  const palette = custom ? htmlPalette(site.config.html ?? "") : {};
  // Anche i link legali devono restare leggibili su una pagina chiara.
  const light = isLightColor(palette.bg ?? site.config.theme.bg_color);
  const htmlBody = custom
    ? injectLegalLinks(
        injectLeadForm(optimizeImages(sanitizeHtml(site.config.html!)), site.slug),
        site.slug,
      )
    : "";
  const hasMain = /<main[\s>]/i.test(htmlBody);

  // Dopo un errore del modulo i valori scritti tornano nei campi (cookie di 10 minuti).
  const jar = await cookies();
  const savedValues =
    contatto && contatto !== "inviato" ? decodeLeadCookie(jar.get(LEAD_COOKIE)?.value) : null;

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
      {contatto && <ContactNotice state={contatto} />}
      {/* sanificato qui e al salvataggio: il payload non deve contenere codice eseguibile */}
      {custom ? (
        // Una pagina HTML scritta a mano porta già la sua struttura: un <main>
        // esterno creerebbe due landmark principali nella stessa pagina.
        hasMain ? (
          <CustomPage
            html={savedValues ? injectLeadValues(htmlBody, savedValues) : htmlBody}
            siteId={site.id}
          />
        ) : (
          <main>
            <CustomPage
              html={savedValues ? injectLeadValues(htmlBody, savedValues) : htmlBody}
              siteId={site.id}
            />
          </main>
        )
      ) : (
        <main>
          <SitePreview site={site.config} siteId={site.id} />
        </main>
      )}
      <SiteLegalLinks slug={site.slug} light={light} />
      {!site.config.hideBadge && <SiteBadge />}
      {/* CustomPage conta già le visite e i clic: qui servirebbe una seconda volta. */}
      {!custom && <SiteTracker siteId={site.id} />}
    </>
  );
}
