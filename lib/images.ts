/**
 * Le immagini caricate da NovaPage esistono in varianti WebP con lo stesso
 * prefisso: `abc-400.webp`, `abc-800.webp`, `abc-1600.webp`. Da un solo URL
 * ricostruiamo il `srcset`, così il browser scarica la misura che gli serve.
 *
 * Fuori da questo schema (foto esterne, vecchi caricamenti .jpg) restituisce
 * undefined: meglio un'immagine normale che un attributo che punta al vuoto.
 */
import type { Site } from "./site";

export const IMAGE_WIDTHS = [400, 800, 1600] as const;

const VARIANT = /^(.*)-(\d+)\.webp(?:\?.*)?$/;

export function srcSetFor(url: string): string | undefined {
  const match = url.match(VARIANT);
  if (!match) return undefined;
  const [, base, width] = match;
  const widest = Number(width);
  if (!Number.isFinite(widest)) return undefined;

  const available = IMAGE_WIDTHS.filter((w) => w <= widest);
  if (available.length < 2) return undefined;

  return available.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
}

/** Tutte le immagini referenziate da una pagina: blocchi, HTML e CSS inline. */
export function collectImageUrls(site: Site): string[] {
  const urls = new Set<string>();
  const add = (value: string | undefined) => {
    const url = value?.trim();
    if (url && /^(https?:\/\/|\/uploads\/)/.test(url)) urls.add(url);
  };

  for (const block of site.blocks) {
    add(block.data.avatar);
    for (const image of block.data.images ?? []) add(image);
    for (const item of block.data.items ?? []) add(item.image);
  }

  const html = site.html ?? "";
  for (const match of html.matchAll(/\b(?:src|poster)\s*=\s*["']([^"']+)["']/gi)) {
    add(match[1].replace(/&amp;/gi, "&"));
  }
  for (const match of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    add(match[1].replace(/&amp;/gi, "&"));
  }

  return [...urls];
}
