import { isValidFamilyName } from "./fonts";
import { applyHtmlPatches, MAX_HTML, sanitizeHtml, toHtmlFragment } from "./html";

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
  /** Testo alternativo della foto: serve a screen reader e indicizzazione. */
  alt?: string;
  status?: string;
  /** Prezzo pieno barrato, mostrato accanto a un prezzo scontato. */
  compareAtPrice?: string;
  /** Direttiva Omnibus: prezzo più basso applicato nei 30 giorni precedenti lo sconto. */
  lowestPrice30?: string;
};

export type HoursRow = { day: string; time: string };

export type InfoRow = {
  label: string;
  value: string;
  /** Mostra il pulsante "Copia" accanto al valore (password Wi-Fi, codici). */
  copy?: boolean;
};

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
  /** Testi alternativi allineati per indice con `images` (le voci mancanti restano vuote). */
  imageAlts?: string[];
  rows?: InfoRow[];
};

export type Block = { id: string; type: BlockType; data: BlockData };


export type ThemeStyle =
  | "aurora"
  | "neon"
  | "editorial"
  | "luxury"
  | "glass"
  | "minimal"
  | "brutal"
  | "paper"
  | "mono"
  | "sunset"
  | "forest"
  | "chrome"
  | "pastel"
  | "riso"
  | "blueprint"
  | "custom";
export type ThemeFont = "sans" | "serif" | "mono";

/** Ruoli tipografici modificabili separatamente. */
export type ThemeFontRole = "heading" | "body" | "label";
export const THEME_FONT_ROLES: ThemeFontRole[] = ["heading", "body", "label"];

/** Le scelte esposte da "Crea personalizzato": valori finiti, non CSS libero. */
export type ThemeLook = {
  radius: "sharp" | "small" | "medium" | "large" | "pill";
  border: "none" | "hairline" | "solid";
  shadow: "none" | "soft" | "strong";
  density: "compact" | "normal" | "airy";
  caps: "none" | "labels" | "all";
};

export const DEFAULT_LOOK: ThemeLook = {
  radius: "medium",
  border: "hairline",
  shadow: "soft",
  density: "normal",
  caps: "labels",
};

export const LOOK_OPTIONS: Record<keyof ThemeLook, Array<ThemeLook[keyof ThemeLook]>> = {
  radius: ["sharp", "small", "medium", "large", "pill"],
  border: ["none", "hairline", "solid"],
  shadow: ["none", "soft", "strong"],
  density: ["compact", "normal", "airy"],
  caps: ["none", "labels", "all"],
};

export type Theme = {
  bg_color: string;
  text_color: string;
  accent_color: string;
  accent2: string;
  style: ThemeStyle;
  font: ThemeFont;
  /** Font per ruolo: id del catalogo (lib/fonts.ts) o famiglia importata. */
  fonts?: Partial<Record<ThemeFontRole, string>>;
  /** Famiglie importate da Google Fonts, oltre al catalogo. */
  customFonts?: string[];
  /** Usato quando `style` è "custom". */
  look?: ThemeLook;
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
  /** Responsabilità sul contenuto HTML: data, versione dell'avviso, traccia della richiesta. */
  legalAck?: { at: string; notice: string; ip?: string; userAgent?: string };
  /** Nasconde il badge "Creato con NovaPage" (riservato ai piani che lo prevedono). */
  hideBadge?: boolean;
  legal?: SiteLegal;
};

export const THEME_STYLES: ThemeStyle[] = [
  "aurora",
  "neon",
  "editorial",
  "luxury",
  "glass",
  "minimal",
  "brutal",
  "paper",
  "mono",
  "sunset",
  "forest",
  "chrome",
  "pastel",
  "riso",
  "blueprint",
  "custom",
];
export const THEME_FONTS: ThemeFont[] = ["sans", "serif", "mono"];

/** Nomi leggibili degli stili, condivisi da tutti gli editor. */
export const THEME_STYLE_LABELS: Record<ThemeStyle, string> = {
  aurora: "Aurora",
  neon: "Neon",
  editorial: "Editoriale",
  luxury: "Luxury",
  glass: "Glass",
  minimal: "Minimal",
  brutal: "Brutal",
  paper: "Carta",
  mono: "Mono",
  sunset: "Tramonto",
  forest: "Bosco",
  chrome: "Cromato",
  pastel: "Pastello",
  riso: "Riso",
  blueprint: "Blueprint",
  custom: "Personalizzato",
};

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

/** Blocco nuovo con i contenuti di partenza del suo tipo, usato dagli editor. */
export function defaultBlock(type: BlockType): Block {
  return { id: newId("blk"), type, data: { ...DEFAULT_DATA[type] } };
}

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

export type SiteTemplateId = "essenziale" | "attivita" | "professionista" | "vetrina";

export const SITE_TEMPLATES: Array<{ id: SiteTemplateId; label: string; hint: string }> = [
  { id: "essenziale", label: "Essenziale", hint: "Hero e contatti" },
  { id: "attivita", label: "Attività locale", hint: "Orari, foto, contatti" },
  { id: "professionista", label: "Professionista", hint: "Servizi e modulo" },
  { id: "vetrina", label: "Vetrina prodotti", hint: "Catalogo e modulo" },
];

/**
 * Configurazione di partenza di un nuovo sito: il template cambia solo i blocchi,
 * così l'utente non riparte sempre dalla stessa pagina vuota.
 */
export function templateConfig(title: string, template?: string): Site {
  const clean = title.trim().slice(0, 60) || "La mia pagina";
  const make = (type: BlockType, data: BlockData = {}): Block => ({
    id: newId("blk"),
    type,
    data: { ...DEFAULT_DATA[type], ...data },
  });

  const blocks: Block[] = [make("hero", { title: clean })];
  switch (template) {
    case "attivita":
      blocks.push(make("hours"), make("gallery"), make("contact"));
      break;
    case "professionista":
      blocks.push(
        make("links", {
          buttons: [
            { label: "Scrivimi su WhatsApp", url: "https://wa.me/39", icon: "whatsapp", variant: "primary" },
          ],
        }),
        make("form"),
      );
      break;
    case "vetrina":
      blocks.push(make("catalog"), make("form"));
      break;
    default:
      blocks.push(make("contact"));
  }

  return {
    meta: { title: clean, description: "Pagina creata con NovaPage" },
    theme: { ...INITIAL_SITE.theme },
    blocks,
  };
}

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
        alt: str(p.alt),
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
  // Senza immagini gli alt non hanno a cosa riferirsi.
  if (out.images?.length) {
    const alts = strList(d.imageAlts)?.map((a) => a.slice(0, 120));
    if (alts?.length) out.imageAlts = alts;
  }
  if (Array.isArray(d.rows)) {
    out.rows = d.rows
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .slice(0, 12)
      .map((r) => {
        const row: InfoRow = { label: str(r.label) ?? "", value: str(r.value) ?? "" };
        // Solo un true esplicito: un valore mancante resta senza pulsante.
        if (r.copy === true) row.copy = true;
        return row;
      })
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

    if (t.fonts && typeof t.fonts === "object") {
      const fonts = t.fonts as Record<string, unknown>;
      const next: Partial<Record<ThemeFontRole, string>> = {};
      for (const role of THEME_FONT_ROLES) {
        const value = typeof fonts[role] === "string" ? (fonts[role] as string).trim().slice(0, 60) : "";
        if (value) next[role] = value;
      }
      theme.fonts = Object.keys(next).length ? next : undefined;
    }

    const custom = strList(t.customFonts, 6)?.map((name) => name.trim()).filter(isValidFamilyName);
    theme.customFonts = custom?.length ? [...new Set(custom)] : undefined;

    if (t.look && typeof t.look === "object") {
      const raw = t.look as Record<string, unknown>;
      const look: ThemeLook = { ...DEFAULT_LOOK, ...(theme.look ?? {}) };
      for (const key of Object.keys(LOOK_OPTIONS) as Array<keyof ThemeLook>) {
        const value = raw[key];
        if (typeof value === "string" && (LOOK_OPTIONS[key] as string[]).includes(value)) {
          // Le chiavi sono omogenee per tipo: l'assegnazione resta un cast locale.
          (look as Record<string, string>)[key] = value;
        }
      }
      theme.look = look;
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

  const rawAck = (r.legalAck && typeof r.legalAck === "object" ? r.legalAck : null) as Record<
    string,
    unknown
  > | null;
  const ackAt =
    typeof rawAck?.at === "string"
      ? rawAck.at.slice(0, 40)
      : typeof r.legalAckAt === "string"
        ? r.legalAckAt.slice(0, 40)
        : undefined;
  const legalAck = ackAt
    ? {
        at: ackAt,
        notice: typeof rawAck?.notice === "string" ? rawAck.notice.slice(0, 20) : "html-v1",
        ...(typeof rawAck?.ip === "string" ? { ip: rawAck.ip.slice(0, 60) } : null),
        ...(typeof rawAck?.userAgent === "string" ? { userAgent: rawAck.userAgent.slice(0, 160) } : null),
      }
    : undefined;

  return {
    meta,
    theme,
    blocks,
    ...(legal ? { legal } : null),
    ...(html ? { html } : null),
    ...(legalAck ? { legalAck } : null),
    ...(r.hideBadge === true ? { hideBadge: true } : null),
  };
}

/**
 * La prima volta che una pagina passa all'HTML libero si registra la data in cui
 * chi pubblica si assume la responsabilità del contenuto: vale sia per la chat
 * sia per il salvataggio dall'editor.
 */
export function withLegalAck(
  previous: Site | undefined,
  next: Site,
  meta: { ip?: string; userAgent?: string } = {},
): Site {
  if (!next.html || previous?.html || next.legalAck) return next;
  return {
    ...next,
    legalAck: {
      at: new Date().toISOString(),
      notice: "html-v1",
      ...(meta.ip ? { ip: meta.ip.slice(0, 60) } : null),
      ...(meta.userAgent ? { userAgent: meta.userAgent.slice(0, 160) } : null),
    },
  };
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
      case "set_block": {
        const data = normalizeData(a.data);
        const blockId = typeof a.block_id === "string" ? a.block_id : "";
        if (blockId) {
          const block = next.blocks.find((b) => b.id === blockId);
          if (block) block.data = { ...block.data, ...data };
          break;
        }
        const type = a.type as BlockType;
        if (!BLOCK_TYPES.includes(type)) break;
        const pos = typeof a.position === "number" ? a.position : next.blocks.length;
        next.blocks.splice(Math.max(0, Math.min(pos, next.blocks.length)), 0, {
          id: newId("blk"),
          type,
          data: { ...DEFAULT_DATA[type], ...data },
        });
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
      case "patch_html": {
        if (!next.html) break;
        const ops = Array.isArray(a.patches) ? (a.patches as unknown[]) : [];
        const result = applyHtmlPatches(
          next.html,
          ops
            .filter((op): op is Record<string, unknown> => !!op && typeof op === "object")
            .map((op) => ({ find: String(op.find ?? ""), replace: String(op.replace ?? "") })),
        );
        if (result.applied > 0) next.html = sanitizeHtml(toHtmlFragment(result.html));
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
