import { parseFragment, serialize } from "parse5";
import { MAX_HTML, toHtmlFragment } from "./html";

/**
 * Sanificazione con un parser HTML vero, usata sui percorsi di scrittura
 * (PATCH del sito e chat). L'espressione regolare in `lib/html.ts` resta come
 * rete di sicurezza per i client, dove un parser costerebbe troppo in KB.
 *
 * Qui non si indovina la struttura: si costruisce l'albero, si eliminano i nodi
 * pericolosi con i loro figli e si riserializza.
 */

type Attr = { name: string; value: string };
type Node = {
  nodeName: string;
  tagName?: string;
  attrs?: Attr[];
  childNodes?: Node[];
  value?: string;
  content?: { childNodes: Node[] };
};

const DROP = new Set([
  "iframe",
  "object",
  "embed",
  "applet",
  "base",
  "meta",
  "frame",
  "frameset",
  "noscript",
  "template",
  "math",
  "svg",
  "foreignobject",
]);

const BAD_SCHEME = /^(javascript|vbscript|data:text\/html|data:application\/xhtml)/i;
const URL_ATTRS = new Set(["href", "src", "action", "formaction", "poster", "xlink:href"]);

function cleanChildren(nodes: Node[]): Node[] {
  return nodes.filter((node) => cleanNode(node));
}

function cleanNode(node: Node): boolean {
  if (node.nodeName === "#comment") return false;
  if (node.nodeName === "#text") return true;

  const tag = (node.tagName ?? "").toLowerCase();

  if (tag === "script") {
    const type = (node.attrs ?? []).find((attr) => attr.name === "type")?.value ?? "";
    if (!/application\/ld\+json/i.test(type)) return false;
    const body = (node.childNodes ?? []).map((child) => child.value ?? "").join("");
    try {
      JSON.parse(body);
    } catch {
      return false;
    }
    return true;
  }

  if (DROP.has(tag)) return false;

  if (node.attrs) {
    node.attrs = node.attrs.filter((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) return false;
      if (name === "srcdoc") return false;
      if (URL_ATTRS.has(name) && BAD_SCHEME.test(attr.value.replace(/[\s\u0000-\u001f]/g, ""))) {
        attr.value = "#";
      }
      return true;
    });
  }

  if (node.childNodes) node.childNodes = cleanChildren(node.childNodes);
  if (node.content?.childNodes) node.content.childNodes = cleanChildren(node.content.childNodes);

  return true;
}

export function sanitizeHtmlStrict(html: string): string {
  if (!html.trim()) return "";

  const fragment = parseFragment(toHtmlFragment(html).slice(0, MAX_HTML)) as unknown as Node;
  fragment.childNodes = cleanChildren(fragment.childNodes ?? []);

  return serialize(fragment as never)
    .replace(/expression\s*\(/gi, "(")
    .replace(/url\s*\(\s*['"]?\s*(javascript|vbscript|data:text\/html)/gi, "url(")
    // Rete di sicurezza: qualsiasi script sopravvissuto all'albero.
    .replace(/<script\b(?![^>]*ld\+json)[\s\S]*?<\/script\s*>/gi, "")
    .trim();
}
