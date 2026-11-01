/**
 * HTML libero delle landing.
 *
 * Il codice viene scritto dall'IA o incollato dall'utente e reso inline nella
 * pagina pubblica: è quindi HTML e CSS senza limiti di layout, ma senza script.
 * Uno script inline su questo dominio girerebbe con i cookie dell'app e potrebbe
 * chiamare le API a nome del visitatore, quindi viene rimosso, non sandboxato.
 * I dati strutturati JSON-LD sono l'eccezione: sono dati inerti, non codice, e
 * Google li legge.
 */

import { srcSetFor } from "./images";

export const MAX_HTML = 120_000;

/** Dati schema.org: conservati. */
const JSON_LD = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script\s*>/gi;
const JSON_LD_TOKEN = /\u0000jsonld:(\d+)\u0000/g;

/** Tag che eseguono codice, reindirizzano o cambiano il documento: rimossi con il contenuto. */
const DANGEROUS_ELEMENTS =
  /<(script|iframe|object|embed|applet|frame|frameset|base|meta)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
/** Varianti auto-chiuse o non chiuse (<script src=… />). */
const DANGEROUS_SELF = /<\/?(script|iframe|object|embed|applet|frame|frameset|base|meta)\b[^>]*>/gi;
/** Gestori di evento inline: on*="…". */
const EVENT_HANDLER = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
/** Attributi che accettano un URL e possono contenere uno schema pericoloso. */
const URL_ATTRIBUTE =
  /\b(href|src|action|formaction|poster|xlink:href|srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const BAD_SCHEME = /^(javascript|vbscript|data:text\/html|data:application\/xhtml)/i;

function stripUrlAttributes(html: string): string {
  return html.replace(URL_ATTRIBUTE, (match, name: string, value: string) => {
    const raw = value.replace(/^["']|["']$/g, "").trim();
    const decoded = raw.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
    if (name.toLowerCase() === "srcdoc") return "";
    if (BAD_SCHEME.test(decoded.replace(/[\s\u0000-\u001f]/g, ""))) return `${name}="#"`;
    return match;
  });
}

/** HTML dell'utente ripulito da ciò che può eseguire codice. */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  const structured: string[] = [];
  const protectedInput = input.slice(0, MAX_HTML).replace(JSON_LD, (block) => {
    const body = block.replace(/^<script\b[^>]*>/i, "").replace(/<\/script\s*>$/i, "");
    try {
      JSON.parse(body);
    } catch {
      return "";
    }
    structured.push(block.slice(0, 20_000));
    return `\u0000jsonld:${structured.length - 1}\u0000`;
  });

  const clean = stripUrlAttributes(
    protectedInput
      .replace(DANGEROUS_ELEMENTS, "")
      .replace(DANGEROUS_SELF, "")
      .replace(EVENT_HANDLER, "")
      // expression() e url(javascript:) sono vettori attivi dentro i <style>.
      .replace(/expression\s*\(/gi, "(")
      .replace(/url\s*\(\s*['"]?\s*(javascript|vbscript|data:text\/html)/gi, "url("),
  );

  return clean.replace(JSON_LD_TOKEN, (_, index: string) => structured[Number(index)] ?? "").trim();
}

/** true se la pagina è in modalità HTML libero invece che a blocchi. */
export function isHtmlPage(site: { html?: string | null }): boolean {
  return typeof site.html === "string" && site.html.trim().length > 0;
}

/**
 * Solo `body` se l'utente incolla un documento completo: un `<html>` dentro una
 * pagina Next anniderebbe due documenti. Gli `<style>` dell'head vengono tenuti.
 */
export function toHtmlFragment(input: string): string {
  const trimmed = input.trim();
  if (!/<\s*(!doctype|html)\b/i.test(trimmed)) return trimmed;

  const headStyles = [...trimmed.matchAll(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi)]
    .map((match) => match[0])
    .join("\n");
  const body = trimmed.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] ?? trimmed;

  return `${headStyles}\n${body}`.trim();
}

/** Palette letta dalle custom property del CSS: serve a `theme-color` e all'anteprima social. */
export function htmlPalette(html: string): { bg?: string; text?: string; accent?: string } {
  const read = (names: string[]) => {
    for (const name of names) {
      const match = html.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})`, "i"));
      if (match) return match[1].toLowerCase();
    }
    return undefined;
  };

  return {
    bg: read(["bg", "background", "sfondo", "fondo", "surface"]),
    text: read(["text", "fg", "foreground", "testo"]),
    accent: read(["accent", "primary", "brand", "gold", "highlight", "accento"]),
  };
}

/** Un fondo chiaro richiede testo scuro: i link legali non devono sparire. */
export function isLightColor(hex: string): boolean {
  const value = hex.replace("#", "");
  if (value.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/**
 * Sintesi strutturale della pagina: al modello serve la forma (sezioni, titoli,
 * palette), non ottomila caratteri di CSS a ogni messaggio.
 */
export function htmlOutline(html: string): string {
  const headings = [...html.matchAll(/<h([12])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => plainText(match[2], 70))
    .filter(Boolean)
    .slice(0, 12);
  const palette = htmlPalette(html);
  const sections = (html.match(/<section\b/gi) ?? []).length;
  const links = (html.match(/<a\b/gi) ?? []).length;

  return [
    "STRUTTURA DELLA PAGINA IN HTML:",
    `- ${html.length} caratteri, ${sections} sezioni, ${links} link`,
    palette.bg
      ? `- palette: sfondo ${palette.bg}, testo ${palette.text ?? "?"}, accento ${palette.accent ?? "?"}`
      : "",
    headings.length ? `- titoli: ${headings.join(" | ")}` : "",
    /data-novapage-lead|<form\b/i.test(html) ? "- modulo contatti: presente" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Le immagini scritte dall'IA non dichiarano `loading`/`decoding`: il browser
 * scarica tutto subito oppure niente. Qui la prima immagine (candidata LCP) è
 * prioritaria, le altre vengono differite, così la pagina dipinge prima.
 */
export function optimizeImages(html: string): string {
  let seen = 0;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const first = seen === 0;
    seen += 1;
    let out = tag;

    out = out.replace(/\sloading\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    if (!/\sdecoding\s*=/i.test(out)) {
      out = out.replace(/\s*\/?>$/, (end) => ` decoding="async"${end}`);
    }
    out = out.replace(/\s*fetchpriority\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

    // Stessa scala di varianti delle landing a blocchi: una foto caricata da
    // NovaPage non deve arrivare intera a un telefono.
    if (!/\ssrcset\s*=/i.test(out)) {
      const src = out.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const set = src ? srcSetFor(src[1] ?? src[2] ?? "") : undefined;
      if (set) {
        out = out.replace(/\s*\/?>$/, (end) => ` srcset="${set}" sizes="(max-width: 720px) 100vw, 720px"${end}`);
      }
    }

    return out.replace(/\s*\/?>$/, (end) =>
      first ? ` loading="eager" fetchpriority="high"${end}` : ` loading="lazy"${end}`,
    );
  });
}

/**
 * Il modulo contatti scritto dall'IA non conosce lo slug: il server aggiunge i
 * campi nascosti (slug e honeypot) al momento del render.
 */
export function injectLeadForm(html: string, slug: string): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "");
  return html.replace(
    /<form\b[^>]*data-novapage-lead[^>]*>/gi,
    (tag) =>
      `${tag}<input type="hidden" name="slug" value="${safeSlug}"><input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:0;height:0;opacity:0">`,
  );
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);

/**
 * Un modello può fermarsi a metà documento. Qui si controlla che il frammento sia
 * completo prima di salvarlo: una pagina troncata è peggio di nessuna modifica.
 */
export function validateHtml(html: string): string[] {
  if (!html.trim()) return ["HTML vuoto"];
  const problems: string[] = [];

  const styleOpen = (html.match(/<style\b/gi) ?? []).length;
  const styleClose = (html.match(/<\/style\s*>/gi) ?? []).length;
  if (styleOpen !== styleClose) problems.push(`<style> non bilanciati (${styleOpen} aperti, ${styleClose} chiusi)`);

  const stack: string[] = [];
  for (const match of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g)) {
    const name = match[2].toLowerCase();
    if (VOID_TAGS.has(name) || match[3]) continue;
    if (!match[1]) {
      stack.push(name);
      continue;
    }
    if (stack[stack.length - 1] === name) stack.pop();
    else {
      problems.push(`chiusura </${name}> fuori ordine`);
      break;
    }
  }
  if (stack.length) problems.push(`tag non chiusi: ${stack.slice(-6).join(", ")}`);

  const lastLt = html.lastIndexOf("<");
  if (lastLt !== -1 && !html.slice(lastLt).includes(">")) problems.push("documento troncato dentro un tag");
  if (/<\s*(html|body|head)\b/i.test(html)) problems.push("documento completo invece di frammento");

  return problems;
}

/**
 * Modifiche chirurgiche: sostituisce solo i frammenti indicati. Un `find` ambiguo
 * (troppe occorrenze) viene rifiutato invece di cambiare mezza pagina.
 */
export function applyHtmlPatches(
  html: string,
  patches: Array<{ find: string; replace: string }>,
): { html: string; applied: number; failed: string[] } {
  let next = html;
  let applied = 0;
  const failed: string[] = [];

  for (const patch of patches.slice(0, 12)) {
    const find = typeof patch.find === "string" ? patch.find : "";
    const replace = typeof patch.replace === "string" ? patch.replace : "";
    if (!find) {
      failed.push("(find vuoto)");
      continue;
    }
    const occurrences = next.split(find).length - 1;
    if (occurrences === 0) {
      failed.push(find.slice(0, 60));
      continue;
    }
    if (occurrences > 3) {
      failed.push(`${find.slice(0, 40)} (${occurrences} occorrenze)`);
      continue;
    }
    next = next.split(find).join(replace);
    applied += 1;
  }

  return { html: next, applied, failed };
}

/** Riempie il segnaposto dei link legali scritto dall'IA nel footer della pagina. */
export function injectLegalLinks(html: string, slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  const links = `<nav data-np-legal style="display:block;text-align:center;font-size:11px;line-height:1.7;padding:16px 12px;opacity:.65"><a href="/s/${safe}/privacy" style="color:inherit">Privacy</a> · <a href="/s/${safe}/cookie" style="color:inherit">Cookie</a> · <a href="/s/${safe}/termini" style="color:inherit">Termini</a></nav>`;

  return html.replace(/<span\b[^>]*data-novapage-legal[^>]*>\s*<\/span>/gi, links);
}

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Rimette nei campi i valori che il visitatore aveva già scritto dopo un errore. */
export function injectLeadValues(
  html: string,
  values: { name?: string; email?: string; phone?: string; message?: string },
): string {
  let out = html;
  for (const key of ["name", "email", "phone", "message"] as const) {
    const value = (values[key] ?? "").slice(0, 1000);
    if (!value) continue;
    const escaped = escapeAttribute(value);
    out = out.replace(new RegExp(`<input\\b[^>]*name=["']${key}["'][^>]*>`, "gi"), (tag) =>
      /\bvalue\s*=/.test(tag) ? tag : tag.replace(/>$/, ` value="${escaped}">`),
    );
    out = out.replace(
      new RegExp(`(<textarea\\b[^>]*name=["']${key}["'][^>]*>)\\s*(</textarea>)`, "gi"),
      `$1${escaped}$2`,
    );
  }
  return out;
}

/** Testo visibile, usato per la meta description quando l'utente non ne scrive una. */
export function plainText(html: string, max = 400): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
