/**
 * HTML libero delle landing.
 *
 * Il codice viene scritto dall'IA o incollato dall'utente e reso inline nella
 * pagina pubblica: è quindi HTML e CSS senza limiti di layout, ma senza script.
 * Uno script inline su questo dominio girerebbe con i cookie dell'app e potrebbe
 * chiamare le API a nome del visitatore, quindi viene rimosso, non sandboxato.
 */

export const MAX_HTML = 120_000;

/** Tag che eseguono codice, reindirizzano o cambiano il documento: rimossi con il contenuto. */
const DANGEROUS_ELEMENTS = /<(script|iframe|object|embed|applet|frame|frameset|base|meta)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
/** Varianti auto-chiuse o non chiuse (<script src=… />). */
const DANGEROUS_SELF = /<\/?(script|iframe|object|embed|applet|frame|frameset|base|meta)\b[^>]*>/gi;
/** Gestori di evento inline: on*="…". */
const EVENT_HANDLER = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
/** Attributi che accettano un URL e possono contenere uno schema pericoloso. */
const URL_ATTRIBUTE = /\b(href|src|action|formaction|poster|xlink:href|srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
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
  return stripUrlAttributes(
    input
      .slice(0, MAX_HTML)
      .replace(DANGEROUS_ELEMENTS, "")
      .replace(DANGEROUS_SELF, "")
      .replace(EVENT_HANDLER, "")
      // expression() e url(javascript:) sono vettori attivi dentro i <style>.
      .replace(/expression\s*\(/gi, "(")
      .replace(/url\s*\(\s*['"]?\s*(javascript|vbscript|data:text\/html)/gi, "url("),
  ).trim();
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
