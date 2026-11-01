import type { Site } from "./site";
import { isHtmlPage, plainText } from "./html";

/**
 * Dati strutturati schema.org generati dal contenuto reale della pagina.
 * Se una landing non ha indirizzo, prezzi o orari, i campi corrispondenti non
 * vengono inventati: si emette solo ciò che la pagina mostra davvero.
 */

export const BRAND = "NovaPage";

type Json = Record<string, unknown>;

const SOCIAL = [
  /instagram\.com/i,
  /tiktok\.com/i,
  /facebook\.com/i,
  /youtube\.com|youtu\.be/i,
  /linkedin\.com/i,
  /(?:^|\/\/)(?:www\.)?x\.com|twitter\.com/i,
  /t\.me/i,
  /wa\.me|whatsapp\.com/i,
];

/** Profili social realmente linkati nella pagina (per `sameAs`). */
export function socialProfileUrls(site: Site): string[] {
  const urls = new Set<string>();
  for (const block of site.blocks) {
    for (const button of block.data.buttons ?? []) {
      const url = button.url.trim();
      if (!/^https?:\/\//i.test(url)) continue;
      if (SOCIAL.some((pattern) => pattern.test(url))) urls.add(url);
    }
  }
  return [...urls].slice(0, 12);
}

/** "12€", "1,50 €", "39.90", "90€/mese" -> numero. null se non è un prezzo. */
export function parsePrice(value: string | undefined): number | null {
  if (!value) return null;
  const match = value
    .replace(/\s/g, "")
    .replace(",", ".")
    .match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 && amount < 1_000_000 ? amount : null;
}

export function absoluteUrl(value: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? `${baseUrl}${value}` : `${baseUrl}/${value}`;
}

/** JSON-LD dentro <script>: `<` va neutralizzato o chiude il tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Meta description della pagina: si usa quella dell'utente solo se è completa e
 * non è un segnaposto, altrimenti se ne costruisce una dai contenuti reali.
 */
export function pageDescription(site: Site, title: string): string {
  const provided = (site.meta.description ?? "").trim();
  const weak =
    provided.length < 50 ||
    /creata con novapage|la mia pagina|lorem ipsum|nome attività|una frase che spiega/i.test(
      provided,
    );
  if (!weak) return provided.slice(0, 160);

  // Pagina in HTML libero: la description nasce dal testo che c'è davvero.
  if (isHtmlPage(site)) {
    const text = plainText(site.html ?? "", 300).replace(/\s+/g, " ").trim();
    return (text ? `${title}: ${text}` : title).slice(0, 160);
  }

  const hero = site.blocks.find((block) => block.type === "hero")?.data;
  const details = [
    hero?.subtitle?.trim(),
    site.blocks.some((block) => (block.data.items ?? []).length > 0) ? "prodotti e prezzi" : "",
    site.blocks.some((block) => (block.data.hours ?? []).length > 0) ? "orari di apertura" : "",
    site.blocks.some((block) => block.type === "contact") ? "contatti" : "",
  ].filter(Boolean);

  const sentence = `${title}${details.length ? `: ${details.join(", ")}` : ""}. Informazioni, orari e link utili in una pagina sola.`;
  return sentence.replace(/\s+/g, " ").slice(0, 160);
}

/** Dati strutturati delle pagine istituzionali (privacy, termini, cookie). */
export function webPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
  baseUrl: string;
}): Json {
  const url = `${input.baseUrl}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${input.baseUrl}/#organization`,
        name: BRAND,
        url: input.baseUrl,
        logo: { "@type": "ImageObject", url: `${input.baseUrl}/icon.svg` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: input.title,
        description: input.description,
        inLanguage: "it-IT",
        isPartOf: { "@id": `${input.baseUrl}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: BRAND, item: input.baseUrl },
          { "@type": "ListItem", position: 2, name: input.title, item: url },
        ],
      },
    ],
  };
}

function businessType(site: Site): string {
  const sells = site.blocks.some((block) => (block.data.items ?? []).length > 0);
  const local = site.blocks.some(
    (block) => Boolean(block.data.address) || (block.data.hours ?? []).length > 0,
  );
  if (sells) return "Store";
  if (local) return "LocalBusiness";
  return "Organization";
}

function images(site: Site, baseUrl: string): string[] {
  return site.blocks
    .flatMap((block) => [block.data.avatar ?? "", ...(block.data.images ?? [])])
    .filter((url) => url && /^(https?:\/\/|\/)/.test(url))
    .map((url) => absoluteUrl(url, baseUrl))
    .slice(0, 6);
}

/** Grafo schema.org della pagina pubblicata. */
export function siteJsonLd(input: { site: Site; slug: string; baseUrl: string }): Json {
  const { site, slug, baseUrl } = input;
  const url = `${baseUrl}/s/${slug}`;
  const title = site.meta.title;
  const description = site.meta.description || `${title}: contatti, orari e link utili.`;

  const contact = site.blocks.find((block) => block.type === "contact")?.data;
  const buttons = site.blocks.flatMap((block) => block.data.buttons ?? []);
  const phone =
    contact?.phone?.trim() ||
    buttons.find((button) => button.url.startsWith("tel:"))?.url.replace(/^tel:/i, "") ||
    "";
  const email =
    contact?.email?.trim() ||
    buttons
      .find((button) => button.url.startsWith("mailto:"))
      ?.url.replace(/^mailto:/i, "")
      .split("?")[0] ||
    "";
  const address = contact?.address?.trim() || "";
  const hours = site.blocks.flatMap((block) =>
    block.type === "hours" ? (block.data.hours ?? []) : [],
  );
  // In HTML libero i blocchi non vengono renderizzati: non si dichiara nulla che la pagina non mostra.
  const custom = isHtmlPage(site);
  const photos = custom ? [] : images(site, baseUrl);
  const products = site.blocks
    .flatMap((block) => block.data.items ?? [])
    .filter((item) => parsePrice(item.price) !== null)
    .slice(0, 24);

  const business: Json = {
    "@type": businessType(site),
    "@id": `${url}#business`,
    name: title,
    description,
    url,
    inLanguage: "it-IT",
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(site.legal?.businessName ? { legalName: site.legal.businessName } : {}),
    ...(site.legal?.vat ? { vatID: site.legal.vat } : {}),
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: address,
            addressCountry: "IT",
          },
        }
      : {}),
    ...(hours.length
      ? { openingHours: hours.map((row) => `${row.day}: ${row.time}`.trim()) }
      : {}),
    ...(photos[0] ? { image: photos[0] } : {}),
    sameAs: socialProfileUrls(site),
  };

  const graph: Json[] = [
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: BRAND,
      url: baseUrl,
      logo: { "@type": "ImageObject", url: `${baseUrl}/icon.svg` },
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: BRAND,
      inLanguage: "it-IT",
      publisher: { "@id": `${baseUrl}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: "it-IT",
      isPartOf: { "@id": `${baseUrl}/#website` },
      about: { "@id": `${url}#business` },
      ...(photos[0] ? { primaryImageOfPage: { "@type": "ImageObject", url: photos[0] } } : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: BRAND, item: baseUrl },
        { "@type": "ListItem", position: 2, name: title, item: url },
      ],
    },
    ...(custom ? [] : [business]),
  ];

  if (products.length && !custom) {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#prodotti`,
      name: `Prodotti e servizi di ${title}`,
      numberOfItems: products.length,
      itemListElement: products.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: item.name,
          ...(item.description ? { description: item.description } : {}),
          ...(item.image ? { image: absoluteUrl(item.image, baseUrl) } : {}),
          offers: {
            "@type": "Offer",
            price: parsePrice(item.price),
            priceCurrency: "EUR",
            availability: /sold ?out|esaurit|non disponibile/i.test(item.status ?? "")
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            url,
          },
        },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/** Grafo della home: prodotto SaaS, organizzazione, sito e FAQ. */
export function homeJsonLd(input: {
  baseUrl: string;
  faq: Array<{ question: string; answer: string }>;
}): Json {
  const { baseUrl, faq } = input;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: BRAND,
        url: baseUrl,
        logo: { "@type": "ImageObject", url: `${baseUrl}/icon.svg` },
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: BRAND,
        inLanguage: "it-IT",
        publisher: { "@id": `${baseUrl}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/#webpage`,
        url: baseUrl,
        name: "NovaPage — landing page per la tua attività, create in chat",
        description:
          "Crea la landing page della tua attività parlando con un assistente AI: testi, colori, contatti e statistiche, con un link pubblico pronto da condividere.",
        inLanguage: "it-IT",
        isPartOf: { "@id": `${baseUrl}/#website` },
        about: { "@id": `${baseUrl}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: BRAND,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Landing page builder",
        operatingSystem: "Web",
        url: baseUrl,
        inLanguage: "it-IT",
        description:
          "Crea la landing page della tua attività conversando con un assistente AI: sezioni, testi, colori, contatti, statistiche e link pubblico.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          description: "Beta gratuita",
        },
        publisher: { "@id": `${baseUrl}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${baseUrl}/#faq`,
        inLanguage: "it-IT",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}
