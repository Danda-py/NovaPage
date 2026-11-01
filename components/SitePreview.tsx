import {
  DEFAULT_LOOK,
  type Block,
  type BlockData,
  type ButtonIcon,
  type LinkButton,
  type Site,
  type Theme,
  type ThemeLook,
  type ThemeStyle,
} from "@/lib/site";
import { legibleAccent, readableOn } from "@/lib/colors";
import { fontStack } from "@/lib/fonts";
import { srcSetFor } from "@/lib/images";
import { LeadForm } from "@/components/LeadForm";
import { InfoBlock } from "@/components/InfoBlock";

/** hex (#rgb or #rrggbb) -> rgba string */
function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function isUsableUrl(url: string): boolean {
  return /^(https?:\/\/|\/|mailto:|tel:|data:image\/)/.test(url);
}

/**
 * "Disponibile" è il valore riempito automaticamente quando manca un'informazione:
 * mostrarlo accanto a ogni prezzo è rumore. Si mostra solo uno stato che dice
 * qualcosa (esaurito, ultimi pezzi, su ordinazione).
 */
function meaningfulStatus(status?: string): string | null {
  const value = status?.trim();
  if (!value) return null;
  if (/^(disponibile|disponibili|available|in stock|in pronta consegna)$/i.test(value)) return null;
  return value;
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "·";
}

const ICONS: Record<ButtonIcon, React.ReactNode> = {
  pdf: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z" />
      <path d="M9 9.2c0 3 2.8 5.8 5.8 5.8l1-1.3-1.9-1-.8.7a3.6 3.6 0 0 1-1.6-1.6l.7-.8-1-1.9z" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: <path d="M10 21a4 4 0 1 1 4-4V3c1.6 3.2 3.8 4.6 6 4.8" />,
  phone: (
    <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4 5.2 2 2 0 0 1 6 3z" />
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  shop: (
    <>
      <path d="M4 9h16l-1 11H5L4 9z" />
      <path d="M8 9V7a4 4 0 0 1 8 0v2" />
    </>
  ),
  none: null,
};

function Icon({ name }: { name?: ButtonIcon }) {
  const path = name ? ICONS[name] : null;
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      {path}
    </svg>
  );
}

const RADIUS: Record<NonNullable<Theme["look"]>["radius"], string> = {
  sharp: "2px",
  small: "10px",
  medium: "18px",
  large: "26px",
  pill: "9999px",
};

const DENSITY: Record<NonNullable<Theme["look"]>["density"], { gap: number; pad: number }> = {
  compact: { gap: 24, pad: 10 },
  normal: { gap: 34, pad: 14 },
  airy: { gap: 46, pad: 20 },
};

/**
 * Ogni stile è una combinazione diversa di questi assi, non solo un altro
 * colore d'accento: raggio, bordi, ombre, densità e maiuscole cambiano insieme.
 * "custom" prende esattamente quello che l'utente ha scelto in "Crea personalizzato".
 */
function styleLook(t: Theme): ThemeLook {
  if (t.style === "custom") return { ...DEFAULT_LOOK, ...(t.look ?? {}) };

  const looks: Record<Exclude<ThemeStyle, "custom">, ThemeLook> = {
    aurora: { radius: "large", border: "hairline", shadow: "soft", density: "normal", caps: "labels" },
    neon: { radius: "small", border: "solid", shadow: "strong", density: "compact", caps: "all" },
    editorial: { radius: "sharp", border: "hairline", shadow: "none", density: "airy", caps: "all" },
    luxury: { radius: "sharp", border: "solid", shadow: "none", density: "airy", caps: "labels" },
    glass: { radius: "large", border: "hairline", shadow: "soft", density: "normal", caps: "none" },
    minimal: { radius: "small", border: "hairline", shadow: "none", density: "compact", caps: "none" },
    brutal: { radius: "sharp", border: "solid", shadow: "strong", density: "compact", caps: "all" },
    paper: { radius: "sharp", border: "hairline", shadow: "none", density: "airy", caps: "labels" },
    mono: { radius: "sharp", border: "solid", shadow: "none", density: "compact", caps: "labels" },
    sunset: { radius: "large", border: "none", shadow: "strong", density: "normal", caps: "none" },
    forest: { radius: "medium", border: "hairline", shadow: "soft", density: "airy", caps: "labels" },
    chrome: { radius: "sharp", border: "solid", shadow: "strong", density: "compact", caps: "all" },
    pastel: { radius: "pill", border: "none", shadow: "soft", density: "airy", caps: "none" },
    riso: { radius: "sharp", border: "solid", shadow: "none", density: "normal", caps: "all" },
    blueprint: { radius: "sharp", border: "hairline", shadow: "none", density: "compact", caps: "labels" },
  };
  return looks[t.style];
}

/**
 * Gli assi del layout, non solo del colore: ogni stile ha una sua gerarchia,
 * un suo modo di disegnare le card e i pulsanti e una sua decorazione dei titoli.
 * È ciò che rende "glass" riconoscibile da "editorial" anche con gli stessi colori.
 */
type StyleTraits = {
  /** Impaginazione da rivista: hero a sinistra, righe sottili, catalogo a elenco. */
  editorial: boolean;
  /** Hero centrato. */
  centered: boolean;
  /** Titolo con testo a gradiente. */
  gradientHeadline: boolean;
  /** 0 nessuna card, 1 card leggera, 2 card con bordo netto, 3 vetro sfumato. */
  surface: 0 | 1 | 2 | 3;
  button: "gradient" | "solid" | "hard" | "soft";
  imageRadius: string;
  divider: "line" | "double" | "bar" | "none";
  titleSize: string;
};

const STYLE_TRAITS: Record<Exclude<ThemeStyle, "custom">, StyleTraits> = {
  aurora: {
    editorial: false,
    centered: true,
    gradientHeadline: true,
    surface: 1,
    button: "gradient",
    imageRadius: "18px",
    divider: "line",
    titleSize: "2.2rem",
  },
  neon: {
    editorial: false,
    centered: true,
    gradientHeadline: true,
    surface: 2,
    button: "gradient",
    imageRadius: "10px",
    divider: "bar",
    titleSize: "2.1rem",
  },
  editorial: {
    editorial: true,
    centered: false,
    gradientHeadline: false,
    surface: 0,
    button: "solid",
    imageRadius: "4px",
    divider: "line",
    titleSize: "2.7rem",
  },
  luxury: {
    editorial: false,
    centered: true,
    gradientHeadline: false,
    surface: 0,
    button: "solid",
    imageRadius: "2px",
    divider: "double",
    titleSize: "2.8rem",
  },
  glass: {
    editorial: false,
    centered: true,
    gradientHeadline: false,
    surface: 3,
    button: "soft",
    imageRadius: "20px",
    divider: "line",
    titleSize: "2.2rem",
  },
  minimal: {
    editorial: false,
    centered: false,
    gradientHeadline: false,
    surface: 0,
    button: "solid",
    imageRadius: "8px",
    divider: "none",
    titleSize: "1.95rem",
  },
  brutal: {
    editorial: false,
    centered: false,
    gradientHeadline: false,
    surface: 2,
    button: "hard",
    imageRadius: "0px",
    divider: "bar",
    titleSize: "2.6rem",
  },
  paper: {
    editorial: true,
    centered: false,
    gradientHeadline: false,
    surface: 0,
    button: "solid",
    imageRadius: "2px",
    divider: "line",
    titleSize: "2.5rem",
  },
  mono: {
    editorial: false,
    centered: false,
    gradientHeadline: false,
    surface: 1,
    button: "hard",
    imageRadius: "0px",
    divider: "bar",
    titleSize: "2rem",
  },
  sunset: {
    editorial: false,
    centered: true,
    gradientHeadline: true,
    surface: 1,
    button: "gradient",
    imageRadius: "24px",
    divider: "line",
    titleSize: "2.4rem",
  },
  forest: {
    editorial: false,
    centered: false,
    gradientHeadline: false,
    surface: 1,
    button: "soft",
    imageRadius: "26px",
    divider: "line",
    titleSize: "2.3rem",
  },
  chrome: {
    editorial: false,
    centered: true,
    gradientHeadline: true,
    surface: 2,
    button: "hard",
    imageRadius: "0px",
    divider: "bar",
    titleSize: "2.5rem",
  },
  pastel: {
    editorial: false,
    centered: true,
    gradientHeadline: false,
    surface: 3,
    button: "soft",
    imageRadius: "28px",
    divider: "line",
    titleSize: "2.25rem",
  },
  riso: {
    editorial: true,
    centered: false,
    gradientHeadline: false,
    surface: 2,
    button: "hard",
    imageRadius: "2px",
    divider: "double",
    titleSize: "2.6rem",
  },
  blueprint: {
    editorial: true,
    centered: false,
    gradientHeadline: false,
    surface: 0,
    button: "solid",
    imageRadius: "0px",
    divider: "double",
    titleSize: "2.2rem",
  },
};

function styleTraits(style: ThemeStyle, look: ThemeLook): StyleTraits {
  if (style !== "custom") return STYLE_TRAITS[style];
  // Lo stile personalizzato ricava il trattamento delle superfici dagli assi scelti.
  return {
    editorial: false,
    centered: true,
    gradientHeadline: false,
    surface: look.border === "none" ? 0 : look.border === "solid" ? 2 : 1,
    button: "solid",
    imageRadius: RADIUS[look.radius],
    divider: "line",
    titleSize: "2.2rem",
  };
}

function tokens(t: Theme) {
  const look = styleLook(t);
  const traits = styleTraits(t.style, look);
  const radius = RADIUS[look.radius];
  const density = DENSITY[look.density];
  const { editorial, centered, gradientHeadline } = traits;

  const bodyFont = fontStack(t.fonts?.body ?? t.font);
  const headingFont = fontStack(t.fonts?.heading ?? t.font);
  const labelFont = fontStack(t.fonts?.label ?? t.font);
  const serif = /serif/i.test(headingFont);

  const cardShadow =
    traits.surface === 2 && t.style === "brutal"
      ? `5px 5px 0 ${alpha(t.text_color, 0.9)}`
      : look.shadow === "none"
        ? undefined
        : look.shadow === "strong"
          ? `0 22px 60px -20px ${alpha(t.accent_color, 0.55)}`
          : "0 14px 36px -24px rgba(0, 0, 0, 0.8)";

  return {
    soft: alpha(t.text_color, 0.66),
    faint: alpha(t.text_color, traits.surface === 3 ? 0.1 : 0.05),
    line: alpha(t.text_color, look.border === "none" ? 0.05 : 0.13),
    border: `${look.border === "none" ? 0 : 1}px solid ${
      look.border === "solid" ? alpha(t.accent_color, 0.55) : alpha(t.text_color, 0.16)
    }`,
    radius,
    buttonRadius: look.radius === "pill" ? "9999px" : look.radius === "sharp" ? "2px" : radius,
    gradient: `linear-gradient(135deg, ${t.accent_color}, ${t.accent2})`,
    glow: `0 14px 40px -14px ${alpha(t.accent_color, 0.75)}`,
    cardShadow,
    gap: density.gap,
    pad: density.pad,
    editorial,
    centered,
    serif,
    vivid: gradientHeadline,
    hairline: `${look.border === "none" ? 0 : 1}px solid ${alpha(t.text_color, 0.16)}`,
    bodyFont,
    headingFont,
    labelFont,
    titleSize: traits.titleSize,
    titleWeight: serif ? 600 : t.style === "brutal" ? 900 : 800,
    titleSpacing: t.style === "neon" || t.style === "brutal" ? "0.02em" : serif ? "-0.01em" : "-0.035em",
    titleTransform: look.caps === "all" ? ("uppercase" as const) : undefined,
    labelTransform: look.caps === "none" ? undefined : ("uppercase" as const),
    labelSpacing:
      t.style === "neon" || t.style === "mono" || t.style === "luxury" || t.style === "chrome"
        ? "0.3em"
        : "0.2em",
    look,
    traits,
    imageRadius: traits.imageRadius,
    /** Superficie delle card: null quando lo stile vive di righe sottili. */
    card: traits.surface
      ? {
          backgroundColor: t.style === "brutal" ? t.bg_color : alpha(t.text_color, traits.surface === 3 ? 0.1 : 0.05),
          border:
            traits.surface === 2
              ? `2px solid ${alpha(t.text_color, t.style === "brutal" ? 0.9 : 0.35)}`
              : `1px solid ${alpha(t.text_color, 0.14)}`,
          borderRadius: radius,
          boxShadow: cardShadow,
          backdropFilter: traits.surface === 3 ? "blur(16px)" : undefined,
        }
      : null,
  };
}

type Tokens = ReturnType<typeof tokens>;

export function SitePreview({
  site,
  siteId,
  slug,
  onSelectBlock,
  selectedBlockId,
  preview = !siteId,
}: {
  site: Site;
  siteId?: string;
  /** Slug pubblico: serve ai link legali della pagina (informativa del modulo). */
  slug?: string;
  onSelectBlock?: (blockId: string) => void;
  selectedBlockId?: string | null;
  /** In anteprima si mostrano anche i segnaposto (link da collegare, modulo demo). */
  preview?: boolean;
}) {
  const t = site.theme;
  const k = tokens(t);
  const glowBackdrop = {
    backgroundImage: `radial-gradient(55% 38% at 12% 0%, ${alpha(t.accent_color, 0.3)}, transparent 70%), radial-gradient(48% 32% at 88% 8%, ${alpha(
      t.accent2,
      0.24,
    )}, transparent 72%), radial-gradient(65% 40% at 50% 102%, ${alpha(t.accent_color, 0.2)}, transparent 75%)`,
  };
  const quietBackdrop = {
    backgroundImage: `linear-gradient(180deg, ${alpha(t.accent_color, 0.1)}, transparent 38%)`,
  };
  // Ogni stile ha un fondale diverso: alone, griglia, gradiente tenue, righe o nulla.
  const backdrop =
    t.style === "neon"
      ? {
          backgroundImage: `radial-gradient(60% 40% at 50% -10%, ${alpha(t.accent_color, 0.35)}, transparent 70%), linear-gradient(${alpha(t.text_color, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(t.text_color, 0.06)} 1px, transparent 1px)`,
          backgroundSize: "auto, 28px 28px, 28px 28px",
        }
      : t.style === "riso"
        ? {
            backgroundImage: `radial-gradient(circle, ${alpha(t.text_color, 0.16)} 1px, transparent 1.4px)`,
            backgroundSize: "9px 9px",
          }
        : t.style === "blueprint"
          ? {
              backgroundImage: `linear-gradient(${alpha(t.accent_color, 0.16)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(t.accent_color, 0.16)} 1px, transparent 1px)`,
              backgroundSize: "24px 24px, 24px 24px",
            }
          : k.editorial
            ? quietBackdrop
            : t.style === "glass"
          ? {
              backgroundImage: `radial-gradient(70% 50% at 20% 0%, ${alpha(t.accent_color, 0.22)}, transparent 70%), radial-gradient(60% 40% at 90% 20%, ${alpha(t.accent2, 0.18)}, transparent 70%)`,
            }
          : t.style === "brutal"
            ? {
                backgroundImage: `repeating-linear-gradient(135deg, ${alpha(t.text_color, 0.05)} 0 1px, transparent 1px 14px)`,
              }
            : t.style === "mono"
              ? {
                  backgroundImage: `linear-gradient(90deg, ${alpha(t.accent_color, 0.14)} 0 1px, transparent 1px)`,
                  backgroundSize: "12.5% 100%",
                }
              : t.style === "minimal" || t.style === "paper"
                ? undefined
                : t.style === "sunset"
                  ? {
                      backgroundImage: `radial-gradient(85% 55% at 50% -5%, ${alpha(t.accent_color, 0.4)}, transparent 68%), radial-gradient(70% 45% at 90% 30%, ${alpha(t.accent2, 0.26)}, transparent 72%)`,
                    }
                  : t.style === "forest"
                    ? {
                        backgroundImage: `radial-gradient(60% 45% at 15% 0%, ${alpha(t.accent_color, 0.24)}, transparent 72%), radial-gradient(50% 40% at 95% 40%, ${alpha(t.accent2, 0.18)}, transparent 74%)`,
                      }
                    : t.style === "chrome"
                      ? {
                          backgroundImage: `linear-gradient(155deg, ${alpha(t.accent_color, 0.22)}, transparent 42%, ${alpha(t.accent2, 0.2)} 78%, transparent)`,
                        }
                      : t.style === "pastel"
                        ? {
                            backgroundImage: `radial-gradient(70% 45% at 25% 0%, ${alpha(t.accent_color, 0.16)}, transparent 74%), radial-gradient(60% 40% at 85% 25%, ${alpha(t.accent2, 0.14)}, transparent 76%)`,
                          }
                        : glowBackdrop;

  return (
    <div
      className="relative min-h-full w-full overflow-hidden"
      style={{ backgroundColor: t.bg_color, color: t.text_color, fontFamily: k.bodyFont }}
    >
      <div className="pointer-events-none absolute inset-0" style={backdrop} aria-hidden />

      <div
        className="relative mx-auto flex w-full max-w-md flex-col px-5 pb-16 pt-12"
        style={{ gap: k.gap, paddingTop: 48 + k.pad, paddingBottom: 64 + k.pad }}
      >
        {t.style === "neon" && (
          <span
            className="mx-auto h-px w-16"
            style={{ backgroundImage: k.gradient }}
            aria-hidden
          />
        )}

        {site.blocks.map((block) =>
          onSelectBlock ? (
            <div
              key={block.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectBlock(block.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectBlock(block.id);
                }
              }}
              className="group relative -mx-2 cursor-pointer rounded-xl px-2 py-1 ring-1 ring-transparent transition-colors hover:ring-violet-500/50 [&_a]:pointer-events-none [&_button]:pointer-events-none [&_input]:pointer-events-none [&_textarea]:pointer-events-none"
              style={
                selectedBlockId === block.id
                  ? { boxShadow: `0 0 0 2px ${alpha(t.accent_color, 0.85)}` }
                  : undefined
              }
              title="Clicca per modificare questo blocco"
            >
              <span
                className="pointer-events-none absolute -top-1 right-2 z-10 hidden rounded bg-violet-600 px-1.5 py-0.5 text-[9px] font-medium text-white group-hover:block"
                aria-hidden
              >
                Modifica
              </span>
              <BlockView block={block} theme={t} k={k} siteId={siteId} slug={slug} preview={preview} />
            </div>
          ) : (
            <BlockView key={block.id} block={block} theme={t} k={k} siteId={siteId} slug={slug} preview={preview} />
          ),
        )}

        {site.blocks.length === 0 && (
          <div
            className="px-4 py-12 text-center text-sm"
            style={{ border: `1px dashed ${k.line}`, color: k.soft, borderRadius: k.radius }}
          >
            Scrivi nella chat per creare la tua pagina
          </div>
        )}

        <footer className="flex flex-col items-center gap-2 pt-5 text-center">
          {(site.legal?.businessName || site.legal?.vat || site.legal?.address) && (
            <div className="space-y-0.5 text-[10px] leading-relaxed" style={{ color: alpha(t.text_color, 0.55) }}>
              {site.legal.businessName && <p>{site.legal.businessName}</p>}
              {site.legal.vat && <p>P.IVA {site.legal.vat}</p>}
              {site.legal.address && <p>{site.legal.address}</p>}
            </div>
          )}
          <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: alpha(t.text_color, 0.55) }}>
            {site.meta.title}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px]"
            style={{
              border: `1px solid ${alpha(t.text_color, 0.16)}`,
              color: alpha(t.text_color, 0.55),
            }}
          >
            <span className="h-1 w-1 rotate-45 rounded-[1px]" style={{ backgroundColor: t.accent_color }} />
            Creato con NovaPage
          </span>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ children, t, k }: { children: React.ReactNode; t: Theme; k: Tokens }) {
  const divider = k.traits.divider;
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      {divider === "none" ? null : divider === "bar" ? (
        <span
          className="h-2.5 w-[3px] shrink-0"
          style={{ backgroundColor: t.accent_color }}
          aria-hidden
        />
      ) : (
        <span
          className="h-px w-4 shrink-0"
          style={{ backgroundColor: t.accent_color }}
          aria-hidden
        />
      )}
      <h2
        className="text-[10px] font-semibold"
        style={{
          color: alpha(t.text_color, 0.72),
          fontFamily: k.labelFont,
          letterSpacing: k.labelSpacing,
          textTransform: k.labelTransform,
        }}
      >
        {children}
      </h2>
      {divider === "double" && (
        <span className="h-px flex-1" style={{ backgroundColor: k.line }} aria-hidden />
      )}
    </div>
  );
}

function BlockView({
  block,
  theme: t,
  k,
  siteId,
  slug,
  preview,
}: {
  block: Block;
  theme: Theme;
  k: Tokens;
  siteId?: string;
  slug?: string;
  preview: boolean;
}) {
  const d: BlockData = block.data;
  // La superficie viene dallo stile: c'è chi vive di card e chi di righe sottili.
  const card = k.card ?? {
    backgroundColor: "transparent",
    border: "0",
    borderRadius: 0,
  };

  switch (block.type) {
    case "hero": {
      if (!(d.title || d.subtitle || d.avatar || d.badge)) return null;
      return (
        <section
          className={`flex flex-col ${k.centered ? "items-center text-center" : "items-start text-left"}`}
        >
          {d.avatar && isUsableUrl(d.avatar) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.avatar}
              srcSet={srcSetFor(d.avatar)}
              sizes="80px"
              alt={d.title ?? ""}
              width={80}
              height={80}
              decoding="async"
              fetchPriority="high"
              className="mb-5 h-20 w-20 object-cover"
              style={{
                borderRadius: k.editorial ? "4px" : "9999px",
                boxShadow: `0 0 0 1px ${alpha(t.accent_color, 0.5)}, 0 0 0 7px ${alpha(t.accent_color, 0.1)}`,
              }}
            />
          )}

          {d.badge &&
            (k.editorial ? (
              <span
                className="mb-3 text-[10px] font-medium tracking-[0.3em]"
                style={{
                  color: t.accent_color,
                  fontFamily: k.labelFont,
                  letterSpacing: k.labelSpacing,
                  textTransform: "uppercase",
                }}
              >
                {d.badge}
              </span>
            ) : (
              <span
                className="mb-3 inline-block px-3 py-1 text-[11px] font-semibold tracking-wide"
                style={{
                  fontFamily: k.labelFont,
                  borderRadius: k.buttonRadius,
                  backgroundColor: alpha(t.accent_color, 0.16),
                  color: legibleAccent(t.accent_color, t.bg_color),
                  border: `1px solid ${alpha(t.accent_color, 0.28)}`,
                }}
              >
                {d.badge}
              </span>
            ))}

          {k.traits.divider === "double" && (
            <span className="mb-4 flex w-full items-center gap-2" aria-hidden>
              <span className="h-px flex-1" style={{ backgroundColor: alpha(t.accent_color, 0.35) }} />
              <span className="h-1 w-1 rotate-45" style={{ backgroundColor: t.accent_color }} />
              <span className="h-px flex-1" style={{ backgroundColor: alpha(t.accent_color, 0.35) }} />
            </span>
          )}

          {k.editorial && (
            <span
              className="relative mb-3 h-px w-14"
              style={{ backgroundColor: alpha(t.accent_color, 0.85) }}
              aria-hidden
            >
              <span
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45"
                style={{ backgroundColor: t.accent_color, boxShadow: `0 0 0 5px ${t.bg_color}` }}
              />
            </span>
          )}

          {d.title && (
            <h1
              className="text-balance"
              style={{
                fontSize: k.titleSize,
                lineHeight: 1.04,
                fontWeight: k.titleWeight,
                letterSpacing: k.titleSpacing,
                fontFamily: k.headingFont,
                textTransform: k.titleTransform,
                ...(k.vivid && !k.serif
                  ? {
                      backgroundImage: k.gradient,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }
                  : null),
              }}
            >
              {d.title}
            </h1>
          )}

          {d.subtitle &&
            (t.style === "editorial" ? (
              <p
                className="mt-4 max-w-[21rem] text-[11px] leading-relaxed"
                style={{
                  color: t.accent_color,
                  fontFamily: k.labelFont,
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                }}
              >
                {d.subtitle}
              </p>
            ) : (
              <p className="mt-3 max-w-[21rem] text-[14px] leading-relaxed" style={{ color: k.soft }}>
                {d.subtitle}
              </p>
            ))}
        </section>
      );
    }

    case "banner": {
      if (!d.text) return null;
      if (k.editorial) {
        return (
          <section
            className="-mx-5 px-5 py-3.5 text-center text-[12.5px] font-medium leading-relaxed"
            style={{ backgroundColor: t.accent_color, color: t.bg_color, letterSpacing: "0.02em" }}
          >
            {d.text}
          </section>
        );
      }
      return (
        <section
          className="px-4 py-3.5 text-center text-[12.5px] font-semibold leading-snug"
          style={{
            borderRadius: k.buttonRadius,
            fontFamily: k.labelFont,
            backgroundImage:
              t.style === "neon"
                ? k.gradient
                : `linear-gradient(135deg, ${alpha(t.accent_color, 0.2)}, ${alpha(t.accent2, 0.14)})`,
            color: t.style === "neon" ? "#0a0a0a" : legibleAccent(t.accent_color, t.bg_color),
            border: `1px solid ${alpha(t.accent_color, 0.3)}`,
            letterSpacing: k.labelSpacing,
          }}
        >
          {d.text}
        </section>
      );
    }

    case "links": {
      const buttons = (d.buttons ?? []).filter((b) => b.label);
      if (!buttons.length) return null;

      const row = (b: LinkButton, i: number) => {
        const custom = b.color && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : null;
        const accent = custom ?? t.accent_color;
        // Un pulsante senza destinazione non va mostrato ai visitatori: in
        // anteprima resta visibile come segnaposto per poterlo collegare.
        if (!isUsableUrl(b.url)) {
          if (!preview) return null;
          return (
            <div
              key={i}
              className="px-4 py-3.5 text-center text-[13px] font-medium"
              style={{ border: `1px dashed ${alpha(accent, 0.5)}`, color: accent, borderRadius: k.radius }}
            >
              {b.label}
              <span className="mt-0.5 block text-[10.5px] font-normal opacity-70">link da configurare</span>
            </div>
          );
        }
        if (k.editorial) {
          return (
            <a
              key={i}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 py-3.5 text-[13.5px] font-medium"
              style={{ borderBottom: k.hairline, color: t.text_color }}
            >
              <span className="flex items-center gap-2.5">
                <Icon name={b.icon} />
                {b.label}
              </span>
              <span aria-hidden style={{ color: accent }}>
                →
              </span>
            </a>
          );
        }
        const ghost = b.variant === "ghost";
        const skin = k.traits.button;
        const style: React.CSSProperties = {
          borderRadius: k.buttonRadius,
          fontFamily: k.labelFont,
          letterSpacing: k.labelSpacing,
          textTransform: k.labelTransform,
        };
        if (ghost) {
          style.color = custom ?? t.text_color;
          style.backgroundColor = alpha(custom ?? t.text_color, 0.06);
          style.border = `1px solid ${alpha(accent, 0.45)}`;
        } else if (custom || skin === "solid" || skin === "hard") {
          // Tinta piena: nessun gradiente, così editorial, paper e minimal restano sobri.
          // "hard" aggiunge bordo netto e ombra piena, senza sfumature.
          style.color = readableOn(custom ?? t.accent_color);
          style.backgroundColor = custom ?? t.accent_color;
          style.border = skin === "hard" ? `2px solid ${alpha(t.text_color, 0.9)}` : "1px solid transparent";
          style.boxShadow = skin === "hard" ? `4px 4px 0 ${alpha(t.text_color, 0.9)}` : undefined;
        } else if (skin === "soft") {
          // Velo: il vetro colora senza spegnere il fondale.
          style.color = legibleAccent(accent, t.bg_color);
          style.backgroundColor = alpha(accent, 0.16);
          style.border = `1px solid ${alpha(accent, 0.42)}`;
          style.backdropFilter = "blur(10px)";
        } else {
          style.color = readableOn(accent);
          style.backgroundImage = k.gradient;
          style.border = "1px solid transparent";
          style.boxShadow = k.look.shadow === "none" ? undefined : k.glow;
        }
        return (
          <a
            key={i}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2.5 py-3.5 text-[13.5px] font-semibold transition-transform active:scale-[0.99]"
            style={style}
          >
            <Icon name={b.icon} />
            {b.label}
          </a>
        );
      };

      return <section className={k.editorial ? "" : "flex flex-col gap-2.5"}>{buttons.map(row)}</section>;
    }

    case "catalog": {
      const items = d.items ?? [];
      if (!items.length) return null;
      const layout = d.layout ?? "grid";

      if (layout === "list" || (k.editorial && layout !== "carousel")) {
        return (
          <section>
            {d.title && <SectionTitle t={t} k={k}>{d.title}</SectionTitle>}
            <ul>
              {items.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3.5 py-3"
                  style={{ borderBottom: k.hairline }}
                >
                  {p.image && isUsableUrl(p.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      srcSet={srcSetFor(p.image)}
                      sizes="56px"
                      alt={p.alt || p.name}
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 shrink-0 object-cover"
                      style={{ borderRadius: k.imageRadius }}
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center text-[15px] font-semibold"
                      style={{
                        borderRadius: k.imageRadius,
                        border: k.hairline,
                        color: alpha(t.text_color, 0.6),
                        backgroundColor: k.faint,
                        fontFamily: k.headingFont,
                      }}
                      aria-hidden
                    >
                      {initials(p.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{p.name}</p>
                    {p.description && (
                      <p className="line-clamp-1 text-[11px] leading-snug" style={{ color: k.soft }}>
                        {p.description}
                      </p>
                    )}
                    {meaningfulStatus(p.status) && (
                      <p className="text-[11.5px]" style={{ color: k.soft }}>
                        {meaningfulStatus(p.status)}
                      </p>
                    )}
                  </div>
                  {p.price && (
                    <div className="shrink-0 text-right">
                      {p.compareAtPrice && (
                        <span className="block text-[10.5px] line-through" style={{ color: k.soft }}>
                          {p.compareAtPrice}
                        </span>
                      )}
                      <span className="text-[13.5px] font-semibold" style={{ color: legibleAccent(t.accent_color, t.bg_color) }}>
                        {p.price}
                      </span>
                      {p.lowestPrice30 && (
                        <span className="block text-[9px]" style={{ color: alpha(t.text_color, 0.55) }}>
                          min 30 gg: {p.lowestPrice30}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      }

      const cardNode = (p: (typeof items)[number], extraClass = "") => {
        const soldOut = /sold|esaurito/i.test(p.status ?? "");
        return (
          <article key={p.id} className={`overflow-hidden ${extraClass}`} style={card}>
                  {p.image && isUsableUrl(p.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      srcSet={srcSetFor(p.image)}
                      sizes="(max-width: 480px) 90vw, 320px"
                      alt={p.alt || p.name}
                      width={400}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex aspect-square w-full items-center justify-center"
                      style={{
                        backgroundImage: k.card
                          ? `linear-gradient(150deg, ${alpha(t.accent_color, 0.22)}, ${alpha(t.accent2, 0.12)})`
                          : undefined,
                        backgroundColor: k.card ? undefined : k.faint,
                        color: alpha(t.text_color, 0.6),
                        fontSize: "1.7rem",
                        fontWeight: k.serif ? 500 : 700,
                        fontFamily: k.headingFont,
                      }}
                      aria-hidden
                    >
                      {initials(p.name)}
                    </div>
                  )}
                  <div className="space-y-1.5 p-3">
                    <p
                      className="line-clamp-2 text-[12.5px] font-semibold leading-snug"
                      style={{ textTransform: t.style === "neon" ? "uppercase" : undefined, letterSpacing: t.style === "neon" ? "0.03em" : undefined }}
                    >
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="line-clamp-2 text-[11px] leading-snug" style={{ color: k.soft }}>
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-1">
                      {p.price && (
                        <span className="min-w-0">
                          {p.compareAtPrice && (
                            <span className="mr-1 text-[10.5px] line-through" style={{ color: k.soft }}>
                              {p.compareAtPrice}
                            </span>
                          )}
                          <span
                            className="text-[13px] font-bold"
                            style={{ color: legibleAccent(t.accent_color, t.bg_color), fontFamily: k.headingFont }}
                          >
                            {p.price}
                          </span>
                          {p.lowestPrice30 && (
                            <span className="mt-0.5 block text-[9px]" style={{ color: alpha(t.text_color, 0.55) }}>
                              min 30 gg: {p.lowestPrice30}
                            </span>
                          )}
                        </span>
                      )}
                      {meaningfulStatus(p.status) && (
                        <span
                          className="px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide"
                          style={{
                            borderRadius: "9999px",
                            backgroundColor: alpha(soldOut ? "#ef4444" : "#22c55e", 0.16),
                            color: soldOut ? "#fca5a5" : "#86efac",
                          }}
                        >
                          {meaningfulStatus(p.status)}
                        </span>
                      )}
                    </div>
                  </div>
        </article>
        );
      };

      return (
        <section>
          {d.title && <SectionTitle t={t} k={k}>{d.title}</SectionTitle>}
          {layout === "carousel" ? (
            <>
              <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items.map((p) => cardNode(p, "w-[62%] shrink-0 snap-center"))}
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: alpha(t.text_color, 0.55) }}>
                scorri →
              </p>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">{items.map((p) => cardNode(p))}</div>
          )}
        </section>
      );
    }

    case "hours": {
      const rows = (d.hours ?? []).filter((h) => h.day || h.time);
      if (!rows.length) return null;
      return (
        <section>
          {d.title && <SectionTitle t={t} k={k}>{d.title}</SectionTitle>}
          <div className={k.card ? "px-4" : ""} style={k.card ?? { borderTop: k.hairline }}>
            {rows.map((h, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-3 py-2.5 text-[13px]"
                style={i || k.editorial ? { borderTop: k.hairline } : undefined}
              >
                <span className="font-medium">{h.day}</span>
                <span style={{ color: k.soft }}>{h.time}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "gallery": {
      const images = (d.images ?? []).filter(isUsableUrl);
      if (!images.length) return null;
      const layout = d.layout ?? "grid";
      const radius = k.imageRadius;

      if (layout === "carousel") {
        return (
          <section>
            {d.title && <SectionTitle t={t} k={k}>{d.title}</SectionTitle>}
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((src, i) => (
                <div
                  key={i}
                  className="relative w-[76%] shrink-0 snap-center overflow-hidden"
                  style={{ aspectRatio: "4 / 5", borderRadius: radius, border: `1px solid ${k.line}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    srcSet={srcSetFor(src)}
                    sizes="76vw"
                    alt={d.imageAlts?.[i] ?? ""}
                    width={640}
                    height={800}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <span
                    className="absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: alpha(t.bg_color, 0.72), color: alpha(t.text_color, 0.9) }}
                  >
                    {i + 1}/{images.length}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em]" style={{ color: alpha(t.text_color, 0.55) }}>
              scorri →
            </p>
          </section>
        );
      }

      return (
        <section>
          {d.title && <SectionTitle t={t} k={k}>{d.title}</SectionTitle>}
          <div className="grid grid-cols-2 gap-2">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                srcSet={srcSetFor(src)}
                sizes="(max-width: 480px) 45vw, 240px"
                alt={d.imageAlts?.[i] ?? ""}
                width={400}
                height={400}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
                style={{ borderRadius: radius, border: `1px solid ${k.line}` }}
              />
            ))}
          </div>
        </section>
      );
    }

    case "info": {
      const rows = (d.rows ?? []).filter((r) => r.label && r.value);
      if (!rows.length) return null;
      return (
        <InfoBlock
          title={d.title}
          rows={rows}
          textColor={t.text_color}
          soft={k.soft}
          line={k.line}
          radius={k.radius}
          faint={k.faint}
        />
      );
    }

    case "form": {
      return (
        <LeadForm
          siteId={siteId}
          slug={slug}
          title={d.title}
          text={d.text}
          accent={t.accent_color}
          onAccent={readableOn(t.accent_color)}
          textColor={t.text_color}
          soft={k.soft}
          line={k.line}
          radius={k.radius}
          gradient={k.gradient}
          vivid={k.vivid}
        />
      );
    }

    case "contact": {
      const hasContent = d.title || d.text || d.phone || d.email || d.whatsapp || d.address;
      if (!hasContent) return null;
      const linkStyle = {
        borderRadius: k.radius,
        border: `1px solid ${k.line}`,
        color: t.text_color,
      } as const;

      return (
        <section
          className={`text-center ${k.card ? "p-4" : ""}`}
          style={k.card ?? { borderTop: k.hairline, paddingTop: "1.25rem" }}
        >
          {d.title && (
            <h2
              className="text-[15px] font-semibold"
              style={{ fontFamily: k.headingFont, letterSpacing: k.serif ? "0.02em" : undefined }}
            >
              {d.title}
            </h2>
          )}
          {d.text && (
            <p className="mx-auto mt-1.5 max-w-[19rem] text-[12.5px] leading-relaxed" style={{ color: k.soft }}>
              {d.text}
            </p>
          )}
          <div className="mt-3.5 flex flex-col gap-2">
            {d.whatsapp && (
              <a
                href={`https://wa.me/${d.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 text-[13.5px] font-semibold"
                style={{
                  borderRadius: k.radius,
                  backgroundImage: k.traits.button === "gradient" ? k.gradient : undefined,
                  backgroundColor: k.traits.button === "gradient" ? undefined : t.accent_color,
                  color: readableOn(t.accent_color),
                  boxShadow: k.traits.button === "gradient" ? k.glow : undefined,
                  border: k.traits.button === "hard" ? `2px solid ${alpha(t.text_color, 0.9)}` : undefined,
                }}
              >
                Scrivi su WhatsApp
              </a>
            )}
            {d.phone && (
              <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="py-2.5 text-[12.5px] font-medium" style={linkStyle}>
                📞 {d.phone}
              </a>
            )}
            {d.email && (
              <a href={`mailto:${d.email}`} className="break-all py-2.5 text-[12.5px] font-medium" style={linkStyle}>
                ✉️ {d.email}
              </a>
            )}
            {d.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 text-[12.5px] font-medium"
                style={linkStyle}
              >
                📍 {d.address}
              </a>
            )}
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}
