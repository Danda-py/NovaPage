/**
 * Font delle landing.
 *
 * Ogni voce ha uno stack CSS pronto (con i ripieghi di sistema) e, quando è un
 * font Google, la famiglia con i pesi che servono: la pagina pubblica carica un
 * solo `<link>` con tutte le famiglie usate, e solo se ce n'è davvero bisogno.
 */
export type FontChoice = {
  id: string;
  label: string;
  stack: string;
  /** Famiglia Google Fonts + pesi, es. "Inter:wght@400;600;800". */
  google?: string;
};

const SYSTEM = "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif";
const SYSTEM_SERIF = "ui-serif, Georgia, Cambria, \"Times New Roman\", serif";
const SYSTEM_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const FONT_CHOICES: FontChoice[] = [
  { id: "sans", label: "Sistema (sans)", stack: SYSTEM },
  { id: "serif", label: "Sistema (serif)", stack: SYSTEM_SERIF },
  { id: "mono", label: "Sistema (mono)", stack: SYSTEM_MONO },
  {
    id: "inter",
    label: "Inter",
    stack: `"Inter", ${SYSTEM}`,
    google: "Inter:wght@400;500;600;700;800",
  },
  {
    id: "manrope",
    label: "Manrope",
    stack: `"Manrope", ${SYSTEM}`,
    google: "Manrope:wght@400;500;600;700;800",
  },
  { id: "sora", label: "Sora", stack: `"Sora", ${SYSTEM}`, google: "Sora:wght@400;500;600;700;800" },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    stack: `"Space Grotesk", ${SYSTEM}`,
    google: "Space+Grotesk:wght@400;500;600;700",
  },
  {
    id: "outfit",
    label: "Outfit",
    stack: `"Outfit", ${SYSTEM}`,
    google: "Outfit:wght@400;500;600;700;800",
  },
  {
    id: "figtree",
    label: "Figtree",
    stack: `"Figtree", ${SYSTEM}`,
    google: "Figtree:wght@400;500;600;700;800",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    stack: `"Playfair Display", ${SYSTEM_SERIF}`,
    google: "Playfair+Display:wght@400;500;600;700",
  },
  {
    id: "dm-serif",
    label: "DM Serif Display",
    stack: `"DM Serif Display", ${SYSTEM_SERIF}`,
    google: "DM+Serif+Display",
  },
  { id: "lora", label: "Lora", stack: `"Lora", ${SYSTEM_SERIF}`, google: "Lora:wght@400;500;600;700" },
  {
    id: "cormorant",
    label: "Cormorant Garamond",
    stack: `"Cormorant Garamond", ${SYSTEM_SERIF}`,
    google: "Cormorant+Garamond:wght@400;500;600;700",
  },
  {
    id: "bebas",
    label: "Bebas Neue",
    stack: `"Bebas Neue", ${SYSTEM}`,
    google: "Bebas+Neue",
  },
  {
    id: "plex-mono",
    label: "IBM Plex Mono",
    stack: `"IBM Plex Mono", ${SYSTEM_MONO}`,
    google: "IBM+Plex+Mono:wght@400;500;600",
  },
];

const BY_ID = new Map(FONT_CHOICES.map((font) => [font.id, font]));

/** Nome di famiglia accettabile per Google Fonts: niente CSS, niente URL. */
export function isValidFamilyName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9 .'-]{0,40}$/.test(name.trim());
}

/**
 * Gli `customFonts` sono nomi di famiglia digitati dall'utente: finiscono in un
 * `font-family` e in un `href`, quindi restano solo se hanno una forma innocua.
 */
export function familyStack(family: string, serif = false): string {
  return `"${family.trim()}", ${serif ? SYSTEM_SERIF : SYSTEM}`;
}

/** Stack CSS per un id del catalogo, oppure per una famiglia importata. */
export function fontStack(id: string | undefined, fallback = "sans"): string {
  if (!id) return fontStack(fallback);
  const known = BY_ID.get(id);
  if (known) return known.stack;
  return isValidFamilyName(id) ? familyStack(id) : SYSTEM;
}

/**
 * Un solo link per tutte le famiglie Google usate nel tema (ruoli + importati).
 * Restituisce null quando bastano i font di sistema: nessuna richiesta esterna.
 */
export function googleFontsHref(input: {
  fonts?: Record<string, string | undefined>;
  customFonts?: string[];
}): string | null {
  const families: string[] = [];

  for (const id of Object.values(input.fonts ?? {})) {
    const known = id ? BY_ID.get(id) : undefined;
    if (known?.google) families.push(known.google);
  }
  for (const family of input.customFonts ?? []) {
    if (isValidFamilyName(family)) families.push(family.trim().replace(/ /g, "+"));
  }

  const unique = [...new Set(families)];
  if (!unique.length) return null;
  return `https://fonts.googleapis.com/css2?${unique.map((family) => `family=${family}`).join("&")}&display=swap`;
}
