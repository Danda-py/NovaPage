import type { Block, BlockData, ButtonIcon, LinkButton, Site, Theme, ThemeFont } from "@/lib/site";
import { legibleAccent, readableOn } from "@/lib/colors";
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

const FONTS: Record<ThemeFont, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

function tokens(t: Theme) {
  const editorial = t.style === "editorial" || t.style === "luxury";
  return {
    soft: alpha(t.text_color, 0.66),
    faint: alpha(t.text_color, t.style === "glass" ? 0.09 : 0.05),
    line: alpha(t.text_color, editorial ? 0.18 : 0.12),
    radius: editorial ? "10px" : t.style === "neon" ? "12px" : "22px",
    gradient: `linear-gradient(135deg, ${t.accent_color}, ${t.accent2})`,
    glow: `0 14px 40px -14px ${alpha(t.accent_color, 0.75)}`,
    editorial,
    serif: t.font === "serif",
    vivid: t.style === "aurora" || t.style === "neon",
    hairline: `1px solid ${alpha(t.text_color, 0.16)}`,
  };
}

type Tokens = ReturnType<typeof tokens>;

export function SitePreview({
  site,
  siteId,
  onSelectBlock,
  selectedBlockId,
  preview = !siteId,
}: {
  site: Site;
  siteId?: string;
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

  return (
    <div
      className="relative min-h-full w-full overflow-hidden"
      style={{ backgroundColor: t.bg_color, color: t.text_color, fontFamily: FONTS[t.font] }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={k.editorial ? quietBackdrop : glowBackdrop}
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-8 px-5 pb-16 pt-12">
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
              <BlockView block={block} theme={t} k={k} siteId={siteId} preview={preview} />
            </div>
          ) : (
            <BlockView key={block.id} block={block} theme={t} k={k} siteId={siteId} preview={preview} />
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
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span
        className="h-px w-4 shrink-0"
        style={{ backgroundColor: t.accent_color }}
        aria-hidden
      />
      <h2
        className="text-[10px] font-semibold uppercase tracking-[0.24em]"
        style={{ color: alpha(t.text_color, 0.72), letterSpacing: k.editorial ? "0.28em" : "0.2em" }}
      >
        {children}
      </h2>
    </div>
  );
}

function BlockView({
  block,
  theme: t,
  k,
  siteId,
  preview,
}: {
  block: Block;
  theme: Theme;
  k: Tokens;
  siteId?: string;
  preview: boolean;
}) {
  const d: BlockData = block.data;
  const card = {
    backgroundColor: k.faint,
    borderColor: k.line,
    borderRadius: k.radius,
    backdropFilter: t.style === "glass" ? "blur(14px)" : undefined,
  } as const;

  switch (block.type) {
    case "hero": {
      if (!(d.title || d.subtitle || d.avatar || d.badge)) return null;
      return (
        <section className="flex flex-col items-center text-center">
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
                className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em]"
                style={{ color: t.accent_color }}
              >
                {d.badge}
              </span>
            ) : (
              <span
                className="mb-3 inline-block px-3 py-1 text-[11px] font-semibold tracking-wide"
                style={{
                  borderRadius: "9999px",
                  backgroundColor: alpha(t.accent_color, 0.16),
                  color: legibleAccent(t.accent_color, t.bg_color),
                  border: `1px solid ${alpha(t.accent_color, 0.28)}`,
                }}
              >
                {d.badge}
              </span>
            ))}

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
                fontSize: k.editorial ? "2.55rem" : "2.15rem",
                lineHeight: 1.04,
                fontWeight: k.serif ? 500 : 800,
                letterSpacing: k.serif ? "-0.01em" : "-0.035em",
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
            (k.editorial ? (
              <p
                className="mt-4 max-w-[21rem] text-[11px] uppercase leading-relaxed"
                style={{ color: t.accent_color, letterSpacing: "0.26em" }}
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
            borderRadius: k.radius,
            backgroundImage:
              t.style === "neon"
                ? k.gradient
                : `linear-gradient(135deg, ${alpha(t.accent_color, 0.2)}, ${alpha(t.accent2, 0.14)})`,
            color: t.style === "neon" ? "#0a0a0a" : t.accent_color,
            border: `1px solid ${alpha(t.accent_color, 0.3)}`,
            letterSpacing: t.style === "neon" ? "0.04em" : undefined,
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
        return (
          <a
            key={i}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2.5 py-3.5 text-[13.5px] font-semibold transition-transform active:scale-[0.99]"
            style={{
              borderRadius: k.radius,
              color: ghost ? (custom ?? t.text_color) : readableOn(custom ?? t.accent_color),
              backgroundImage: !ghost && !custom && k.vivid ? k.gradient : undefined,
              backgroundColor: ghost
                ? alpha(custom ?? t.text_color, 0.06)
                : custom
                  ? custom
                  : k.vivid
                    ? undefined
                    : t.accent_color,
              border: ghost ? `1px solid ${alpha(accent, 0.45)}` : "1px solid transparent",
              boxShadow: !ghost && k.vivid ? `0 14px 40px -14px ${alpha(accent, 0.75)}` : undefined,
              letterSpacing: t.style === "neon" ? "0.05em" : undefined,
              textTransform: t.style === "neon" ? "uppercase" : undefined,
            }}
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
                      style={{ borderRadius: "6px" }}
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center text-[15px] font-semibold"
                      style={{
                        borderRadius: "6px",
                        border: k.hairline,
                        color: alpha(t.text_color, 0.6),
                        backgroundColor: k.faint,
                        fontFamily: k.serif ? FONTS.serif : undefined,
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
                      <span className="text-[13.5px] font-semibold" style={{ color: t.accent_color }}>
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
          <article key={p.id} className={`overflow-hidden border ${extraClass}`} style={card}>
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
                        backgroundImage: `linear-gradient(150deg, ${alpha(t.accent_color, 0.22)}, ${alpha(t.accent2, 0.12)})`,
                        color: alpha(t.text_color, 0.6),
                        fontSize: "1.7rem",
                        fontWeight: k.serif ? 500 : 700,
                        fontFamily: k.serif ? FONTS.serif : undefined,
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
                            style={{ color: t.accent_color, fontFamily: k.serif ? FONTS.serif : undefined }}
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
          <div className={k.editorial ? "" : "border px-4"} style={k.editorial ? undefined : card}>
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
      const radius = k.editorial ? "4px" : "14px";

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
          accent={t.accent_color}
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
          className={k.editorial ? "text-center" : "border p-4 text-center"}
          style={k.editorial ? { borderTop: k.hairline, paddingTop: "1.25rem" } : card}
        >
          {d.title && (
            <h2
              className="text-[15px] font-semibold"
              style={{ fontFamily: k.serif ? FONTS.serif : undefined, letterSpacing: k.serif ? "0.02em" : undefined }}
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
                  backgroundImage: k.vivid ? k.gradient : undefined,
                  backgroundColor: k.vivid ? undefined : t.accent_color,
                  color: readableOn(t.accent_color),
                  boxShadow: k.vivid ? k.glow : undefined,
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
