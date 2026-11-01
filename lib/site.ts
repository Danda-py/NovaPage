import { MAX_HTML, sanitizeHtml, toHtmlFragment } from "./html";

export type BlockType =
  | "hero"
  | "banner"
  | "links"
  | "catalog"
  | "hours"
  | "gallery"
  | "info"
  | "form"
  | "contact";

export type ButtonIcon =
  | "pdf"
  | "pin"
  | "whatsapp"
  | "instagram"
  | "tiktok"
  | "phone"
  | "email"
  | "globe"
  | "calendar"
  | "shop"
  | "none";

export type ButtonVariant = "primary" | "ghost";

export type LinkButton = {
  label: string;
  url: string;
  icon?: ButtonIcon;
  variant?: ButtonVariant;
  /** Colore esadecimale del singolo pulsante; se assente usa l'accento del tema. */
  color?: string;
};

export const BUTTON_ICONS: ButtonIcon[] = [
  "pdf",
  "pin",
  "whatsapp",
  "instagram",
  "tiktok",
  "phone",
  "email",
  "globe",
  "calendar",
  "shop",
  "none",
];

export type Product = {
  id: string;
  name: string;
  price: string;
  description?: string;
  image?: string;
  status?: string;
  /** Prezzo pieno barrato, mostrato accanto a un prezzo scontato. */
  compareAtPrice?: string;
  /** Direttiva Omnibus: prezzo più basso applicato nei 30 giorni precedenti lo sconto. */
  lowestPrice30?: string;
};

export type HoursRow = { day: string; time: string };

export type InfoRow = { label: string; value: string };

export type BlockLayout = "grid" | "carousel" | "list";

export const BLOCK_LAYOUTS: BlockLayout[] = ["grid", "carousel", "list"];

export type BlockData = {
  layout?: BlockLayout;
  title?: string;
  subtitle?: string;
  badge?: string;
  avatar?: string;
  text?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  buttons?: LinkButton[];
  items?: Product[];
  hours?: HoursRow[];
  images?: string[];
  rows?: InfoRow[];
};

export type Block = { id: string; type: BlockType; data: BlockData };

export type ThemeStyle = "aurora" | "neon" | "editorial" | "luxury" | "glass" | "minimal";
export type ThemeFont = "sans" | "serif" | "mono";

export type Theme = {
  bg_color: string;
  text_color: string;
  accent_color: string;
  accent2: string;
  style: ThemeStyle;
  font: ThemeFont;
};

/** Dati del titolare dell'attività, mostrati nel footer delle pagine pubbliche. */
export type SiteLegal = {
  businessName?: string;
  vat?: string;
  address?: string;
};

export type Site = {
  meta: { title: string; description: string };
  theme: Theme;
  blocks: Block[];
  /**
   * HTML libero: se presente, la pagina pubblica mostra questo al posto dei
   * blocchi. È il modo per costruire una landing senza schema imposto.
   */
  html?: string;
  legal?: SiteLegal;
};

export const THEME_STYLES: ThemeStyle[] = ["aurora", "neon", "editorial", "luxury", "glass", "minimal"];
export const THEME_FONTS: ThemeFont[] = ["sans", "serif", "mono"];

export type ToolCall = { name: string; args: Record<string, unknown> };

export type FieldType = "text" | "tel" | "email" | "url" | "number" | "textarea" | "image";

export type AskField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
};

export type Ask = { intro?: string; fields: AskField[] };

const FIELD_TYPES: FieldType[] = ["text", "tel", "email", "url", "number", "textarea", "image"];

/** Valida i campi richiesti dall'IA: chiavi uniche, tipi ammessi, massimo 6 campi. */
export function normalizeAsk(raw: unknown): Ask | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.fields)) return null;

  const seen = new Set<string>();
  const fields: AskField[] = [];
  for (const f of r.fields) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.slice(0, 80) : "";
    if (!label) continue;
    const key = (typeof o.key === "string" ? o.key : label)
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || `campo_${fields.length + 1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const type = FIELD_TYPES.includes(o.type as FieldType) ? (o.type as FieldType) : "text";
    fields.push({
      key,
      label,
      type,
      placeholder: typeof o.placeholder === "string" ? o.placeholder.slice(0, 120) : undefined,
      required: o.required === true,
    });
    if (fields.length >= 6) break;
  }
  if (!fields.length) return null;
  return {
    intro: typeof r.intro === "string" ? r.intro.slice(0, 200) : undefined,
    fields,
  };
}

export const BLOCK_TYPES: BlockType[] = [
  "hero",
  "banner",
  "links",
  "catalog",
  "hours",
  "gallery",
  "info",
  "form",
  "contact",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_DATA: Record<BlockType, BlockData> = {
  hero: { title: "Nome attività", subtitle: "Una frase che spiega cosa fai", badge: "Aperto ora" },
  banner: { text: "Novità in arrivo: scrivi nella chat cosa vuoi mettere in evidenza" },
  links: { buttons: [] },
  catalog: { title: "In evidenza", items: [] },
  hours: { title: "Orari", hours: [] },
  gallery: { title: "Galleria", images: [] },
  info: { title: "Informazioni utili", rows: [] },
  form: { title: "Lasciami i tuoi contatti", text: "Ti rispondo entro 24 ore" },
  contact: { title: "Contatti", text: "Scrivimi per informazioni e prenotazioni" },
};

export const INITIAL_SITE: Site = {
  meta: { title: "La mia pagina", description: "Landing page creata con NovaPage" },
  theme: {
    bg_color: "#09090b",
    text_color: "#f4f4f5",
    accent_color: "#8b5cf6",
    accent2: "#22d3ee",
    style: "aurora",
    font: "sans",
  },
  blocks: [{ id: "blk_hero_start", type: "hero", data: { ...DEFAULT_DATA.hero } }],
};

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v.slice(0, 500) : undefined;
}

/** Scarta gli schemi pericolosi: le password e i testi non sono link. */
function safeUrl(url: string | undefined): string {
  if (!url) return "";
  const value = url.trim();
  if (/^(javascript|vbscript|data):/i.test(value) && !/^data:image\//i.test(value)) return "";
  return value.slice(0, 500);
}

function strList(v: unknown, max = 12): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string").slice(0, max);
}

function normalizeData(raw: unknown): BlockData {
  if (!raw || typeof raw !== "object") return {};
  const d = raw as Record<string, unknown>;
  const out: BlockData = {};
  for (const k of ["title", "subtitle", "badge", "avatar", "text", "phone", "email", "whatsapp", "address"] as const) {
    const v = str(d[k]);
    if (v !== undefined) out[k] = v;
  }
  // Anche le immagini passano dal filtro: un URL non sicuro non deve arrivare al browser.
  if (out.avatar) out.avatar = safeUrl(out.avatar) || undefined;
  if (Array.isArray(d.buttons)) {
    out.buttons = d.buttons
      .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
      .slice(0, 10)
      .map((b) => {
        const color = str(b.color);
        return {
          label: str(b.label) ?? "Link",
          url: safeUrl(str(b.url)),
          icon: BUTTON_ICONS.includes(b.icon as ButtonIcon) ? (b.icon as ButtonIcon) : "none",
          variant: b.variant === "ghost" ? ("ghost" as const) : ("primary" as const),
          ...(color && HEX.test(color) ? { color } : null),
        };
      });
  }
  if (Array.isArray(d.items)) {
    out.items = d.items
      .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
      .slice(0, 24)
      .map((p) => ({
        id: str(p.id) ?? newId("prod"),
        name: str(p.name) ?? "Prodotto",
        price: str(p.price) ?? "",
        description: str(p.description),
        image: safeUrl(str(p.image)),
        status: str(p.status) ?? "Disponibile",
        compareAtPrice: str(p.compareAtPrice),
        lowestPrice30: str(p.lowestPrice30),
      }));
  }
  if (Array.isArray(d.hours)) {
    out.hours = d.hours
      .filter((h): h is Record<string, unknown> => !!h && typeof h === "object")
      .slice(0, 8)
      .map((h) => ({ day: str(h.day) ?? "", time: str(h.time) ?? "" }));
  }
  const images = strList(d.images)?.map(safeUrl).filter(Boolean);
  if (images) out.images = images;
  if (Array.isArray(d.rows)) {
    out.rows = d.rows
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .slice(0, 12)
      .map((r) => ({ label: str(r.label) ?? "", value: str(r.value) ?? "" }))
      .filter((r) => r.label && r.value);
  }
  if (typeof d.layout === "string" && BLOCK_LAYOUTS.includes(d.layout as BlockLayout)) {
    out.layout = d.layout as BlockLayout;
  }
  return out;
}

export const MAX_BLOCKS = 40;

/**
 * HTML libero: documento completo ridotto al solo frammento utile e ripulito da
 * script, iframe e gestori inline prima di essere salvato.
 */
export function normalizeHtml(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const clean = sanitizeHtml(toHtmlFragment(value));
  return clean ? clean.slice(0, MAX_HTML) : undefined;
}

/**
 * Normalizza un intero sito inviato dal client (salvataggio dell'editor):
 * stessa validazione dell'IA, così il JSON salvato non può contenere blocchi
 * sconosciuti, URL pericolosi o colori arbitrari.
 */
export function normalizeSite(raw: unknown): Site | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.blocks)) return null;

  const theme: Theme = { ...INITIAL_SITE.theme };
  if (r.theme && typeof r.theme === "object") {
    const t = r.theme as Record<string, unknown>;
    for (const key of ["bg_color", "text_color", "accent_color", "accent2"] as const) {
      const value = t[key];
      if (typeof value === "string" && HEX.test(value)) theme[key] = value;
    }
    if (typeof t.style === "string" && THEME_STYLES.includes(t.style as ThemeStyle)) {
      theme.style = t.style as ThemeStyle;
    }
    if (typeof t.font === "string" && THEME_FONTS.includes(t.font as ThemeFont)) {
      theme.font = t.font as ThemeFont;
    }
  }

  const rawMeta = (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>;
  const meta = {
    title: str(rawMeta.title) ?? "La mia pagina",
    description: str(rawMeta.description) ?? "",
  };

  const blocks: Block[] = [];
  for (const entry of r.blocks.slice(0, MAX_BLOCKS)) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const type = o.type as BlockType;
    if (!BLOCK_TYPES.includes(type)) continue;
    const blockId = typeof o.id === "string" && o.id.trim() ? o.id.slice(0, 60) : newId("blk");
    blocks.push({ id: blockId, type, data: { ...DEFAULT_DATA[type], ...normalizeData(o.data) } });
  }

  const html = normalizeHtml(r.html);

  const rawLegal = (r.legal && typeof r.legal === "object" ? r.legal : null) as Record<
    string,
    unknown
  > | null;
  const legal: SiteLegal | undefined = rawLegal
    ? {
        businessName: str(rawLegal.businessName),
        vat: str(rawLegal.vat),
        address: str(rawLegal.address),
      }
    : undefined;

  return { meta, theme, blocks, ...(legal ? { legal } : null), ...(html ? { html } : null) };
}

/** Applies AI tool calls to a copy of the site and returns the new site. Invalid calls are ignored. */
export function applyToolCalls(site: Site, calls: ToolCall[]): Site {
  const next: Site = structuredClone(site);

  for (const call of calls) {
    const a = call.args ?? {};
    switch (call.name) {
      case "update_theme": {
        for (const key of ["bg_color", "text_color", "accent_color", "accent2"] as const) {
          const v = a[key];
          if (typeof v === "string" && HEX.test(v)) next.theme[key] = v;
        }
        if (typeof a.style === "string" && THEME_STYLES.includes(a.style as ThemeStyle)) {
          next.theme.style = a.style as ThemeStyle;
        }
        if (typeof a.font === "string" && THEME_FONTS.includes(a.font as ThemeFont)) {
          next.theme.font = a.font as ThemeFont;
        }
        break;
      }
      case "add_block": {
        const type = a.type as BlockType;
        if (!BLOCK_TYPES.includes(type)) break;
        const block: Block = {
          id: newId("blk"),
          type,
          data: { ...DEFAULT_DATA[type], ...normalizeData(a.data) },
        };
        const pos = typeof a.position === "number" ? a.position : next.blocks.length;
        next.blocks.splice(Math.max(0, Math.min(pos, next.blocks.length)), 0, block);
        break;
      }
      case "update_block": {
        const block = next.blocks.find((b) => b.id === a.block_id);
        if (block) block.data = { ...block.data, ...normalizeData(a.data) };
        break;
      }
      case "delete_block": {
        next.blocks = next.blocks.filter((b) => b.id !== a.block_id);
        break;
      }
      case "reorder_blocks": {
        const order = Array.isArray(a.order_array) ? (a.order_array as unknown[]) : [];
        const byId = new Map(next.blocks.map((b) => [b.id, b]));
        const ordered: Block[] = [];
        for (const id of order) {
          const b = typeof id === "string" ? byId.get(id) : undefined;
          if (b) {
            ordered.push(b);
            byId.delete(b.id);
          }
        }
        next.blocks = [...ordered, ...byId.values()];
        break;
      }
      case "set_meta": {
        const title = str(a.title);
        const description = str(a.description);
        if (title) next.meta.title = title;
        if (description) next.meta.description = description;
        break;
      }
      case "write_html": {
        const html = normalizeHtml(a.html);
        if (html) next.html = html;
        const title = str(a.title);
        const description = str(a.description);
        if (title) next.meta.title = title;
        if (description) next.meta.description = description;
        break;
      }
    }
  }
  return next;
}
