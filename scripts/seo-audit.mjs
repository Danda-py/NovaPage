#!/usr/bin/env node
/**
 * Audit SEO di tutte le pagine elencate in sitemap.xml.
 *   node scripts/seo-audit.mjs --base-url=http://localhost:3000
 *   SEO_BASE_URL=https://novapage.site node scripts/seo-audit.mjs
 *
 * Controlla: title, meta description, canonical, OG/Twitter, robots, lingua,
 * JSON-LD schema.org, immagine social raggiungibile, titoli e descrizioni duplicati.
 * Esce con codice 1 se trova almeno un errore (le warnings non bloccano).
 */
const argBase = process.argv.slice(2).find((arg) => arg.startsWith("--base-url="));
const base = (argBase?.split("=")[1] ?? process.env.SEO_BASE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const errors = [];
const warnings = [];
const pages = [];

function decode(value) {
  return value
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function pick(html, pattern) {
  const match = html.match(pattern);
  return match ? decode(match[1].trim()) : null;
}

function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = re.exec(html))) blocks.push(match[1]);
  return blocks;
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function check(page) {
  const label = new URL(page.url).pathname || "/";

  if (!page.title) errors.push(`${label}: <title> mancante`);
  else if (page.title.length < 15 || page.title.length > 65) {
    warnings.push(`${label}: title di ${page.title.length} caratteri (ideale 15-65)`);
  }
  if (/la mia pagina|nome attività|una frase che spiega|lorem ipsum|creata con novapage/i.test(page.title ?? "")) {
    warnings.push(`${label}: title sembra un segnaposto`);
  }

  if (!page.description) errors.push(`${label}: meta description mancante`);
  else if (page.description.length < 50 || page.description.length > 160) {
    warnings.push(`${label}: description di ${page.description.length} caratteri (ideale 50-160)`);
  }

  if (!page.canonical) errors.push(`${label}: canonical mancante`);
  else {
    const canonical = new URL(page.canonical, base);
    const current = new URL(page.url);
    if (canonical.pathname.replace(/\/$/, "") !== current.pathname.replace(/\/$/, "")) {
      errors.push(`${label}: canonical punta a ${canonical.pathname}`);
    }
    if (canonical.host !== current.host) {
      warnings.push(`${label}: canonical su host ${canonical.host}`);
    }
  }

  if (!page.ogTitle) errors.push(`${label}: og:title mancante`);
  if (!page.ogImage) errors.push(`${label}: og:image mancante`);
  if (page.twitter !== "summary_large_image") {
    warnings.push(`${label}: twitter:card assente o diverso da summary_large_image`);
  }
  if (page.robots?.includes("noindex")) errors.push(`${label}: pagina in sitemap marcata noindex`);
  if (page.lang !== "it") warnings.push(`${label}: lang "${page.lang ?? "assente"}"`);

  const types = new Set();
  for (const block of page.jsonLd) {
    try {
      const data = JSON.parse(block);
      const nodes = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const node of nodes) if (node?.["@type"]) types.add(node["@type"]);
    } catch (error) {
      errors.push(`${label}: JSON-LD non valido (${String(error).slice(0, 60)})`);
    }
  }

  const isHome = label === "/";
  if (!page.jsonLd.length) {
    const message = `${label}: nessun JSON-LD`;
    if (page.isLanding || isHome) errors.push(message);
    else warnings.push(message);
  } else if (!types.has("WebPage")) {
    errors.push(`${label}: JSON-LD senza WebPage`);
  }
  if (page.isLanding && !["LocalBusiness", "Store", "Organization", "Restaurant"].some((t) => types.has(t))) {
    errors.push(`${label}: JSON-LD senza nodo dell'attività`);
  }

  page.types = [...types];
}

async function main() {
  console.log(`audit SEO: ${base}\n`);

  const robots = await fetchText(`${base}/robots.txt`);
  if (!/sitemap:/i.test(robots)) errors.push("robots.txt: manca il riferimento alla sitemap");
  if (/^disallow:\s*\/\s*$/im.test(robots)) errors.push("robots.txt: disallow totale");

  let sitemapUrls = [];
  try {
    sitemapUrls = [...(await fetchText(`${base}/sitemap.xml`)).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
  } catch (error) {
    console.error(`sitemap non leggibile: ${error.message}`);
    process.exit(1);
  }
  if (!sitemapUrls.length) {
    console.error("sitemap: nessun URL dichiarato");
    process.exit(1);
  }

  // Le URL assolute della sitemap vengono richieste all'istanza in esame.
  const urls = sitemapUrls.map((loc) => new URL(new URL(loc).pathname, base).toString());

  for (const url of urls) {
    let html;
    try {
      html = await fetchText(url);
    } catch (error) {
      errors.push(`${new URL(url).pathname}: non raggiungibile (${error.message})`);
      continue;
    }
    const page = {
      url,
      isLanding: new URL(url).pathname.startsWith("/s/"),
      title: pick(html, /<title>([^<]*)<\/title>/i),
      description: pick(html, /<meta name="description" content="([^"]*)"/i),
      canonical: pick(html, /<link rel="canonical" href="([^"]*)"/i),
      ogTitle: pick(html, /<meta property="og:title" content="([^"]*)"/i),
      ogImage: pick(html, /<meta property="og:image" content="([^"]*)"/i),
      twitter: pick(html, /<meta name="twitter:card" content="([^"]*)"/i),
      robots: pick(html, /<meta name="robots" content="([^"]*)"/i),
      lang: pick(html, /<html lang="([^"]*)"/i),
      jsonLd: jsonLdBlocks(html),
      types: [],
    };
    pages.push(page);
    check(page);
    console.log(`✓ ${new URL(url).pathname}  [${page.types.join(", ") || "nessun dato strutturato"}]`);
  }

  for (const key of ["title", "description"]) {
    const seen = new Map();
    for (const page of pages) {
      if (!page[key]) continue;
      seen.set(page[key], [...(seen.get(page[key]) ?? []), new URL(page.url).pathname]);
    }
    for (const [value, list] of seen) {
      if (list.length > 1) {
        warnings.push(`${key} duplicato su ${list.length} pagine: "${value.slice(0, 70)}"`);
      }
    }
  }

  const images = [...new Set(pages.map((page) => page.ogImage).filter(Boolean))];
  for (const image of images) {
    try {
      const local = new URL(new URL(image).pathname, base).toString();
      const res = await fetch(local, { signal: AbortSignal.timeout(15000) });
      const type = res.headers.get("content-type") ?? "";
      if (res.status !== 200) errors.push(`og:image ${image}: HTTP ${res.status}`);
      else if (!type.startsWith("image/")) errors.push(`og:image ${image}: content-type ${type}`);
    } catch {
      errors.push(`og:image ${image}: non raggiungibile`);
    }
  }

  console.log(`\npagine: ${pages.length} · immagini social: ${images.length}`);

  if (warnings.length) {
    console.log(`\n${warnings.length} avvisi:`);
    for (const warning of warnings) console.log(`  ! ${warning}`);
  }
  if (errors.length) {
    console.log(`\n${errors.length} errori:`);
    for (const error of errors) console.log(`  ✗ ${error}`);
    process.exit(1);
  }

  console.log("\nnessun errore SEO.");
}

main().catch((error) => {
  console.error("audit interrotto:", error);
  process.exit(1);
});
