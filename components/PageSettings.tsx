"use client";

import { THEME_FONTS, THEME_STYLES, type Site } from "@/lib/site";

const STYLE_LABEL: Record<string, string> = {
  aurora: "Aurora",
  neon: "Neon",
  editorial: "Editoriale",
  luxury: "Luxury",
  glass: "Glass",
  minimal: "Minimal",
};

const FONT_LABEL: Record<string, string> = {
  sans: "Sans (moderno)",
  serif: "Serif (elegante)",
  mono: "Mono (tecnico)",
};

const field =
  "w-full rounded-lg bg-zinc-950 px-3 py-2 text-[13px] outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

/** Le stesse impostazioni che l'IA applica con i tool, ma modificabili a mano. */
export function PageSettings({
  site,
  onChange,
}: {
  site: Site;
  onChange: (site: Site) => void;
}) {
  const meta = site.meta;
  const legal = site.legal ?? {};

  function setMeta(patch: Partial<Site["meta"]>) {
    onChange({ ...site, meta: { ...meta, ...patch } });
  }

  function setTheme(patch: Partial<Site["theme"]>) {
    onChange({ ...site, theme: { ...site.theme, ...patch } });
  }

  function setLegal(patch: NonNullable<Site["legal"]>) {
    onChange({ ...site, legal: { ...legal, ...patch } });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <p className="shrink-0 border-b border-zinc-800 px-4 py-2 text-[10.5px] leading-relaxed text-zinc-500">
        Queste impostazioni valgono per la pagina pubblicata e per le anteprime sui social. Le
        modifiche vengono salvate in automatico.
      </p>

      <div className="space-y-5 p-4">
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Identità della pagina
          </h2>
          <label className="block">
            <span className="block text-[10.5px] uppercase tracking-wider text-zinc-500">Titolo</span>
            <input
              value={meta.title}
              onChange={(e) => setMeta({ title: e.target.value })}
              maxLength={80}
              className={`${field} mt-1`}
              placeholder="Nome dell'attività"
            />
          </label>
          <label className="block">
            <span className="block text-[10.5px] uppercase tracking-wider text-zinc-500">
              Descrizione
            </span>
            <textarea
              value={meta.description}
              onChange={(e) => setMeta({ description: e.target.value })}
              maxLength={300}
              rows={3}
              className={`${field} mt-1 resize-y leading-relaxed`}
              placeholder="Cosa fa l'attività, in una frase (almeno 30 caratteri)"
            />
            <span className="mt-1 block text-[10.5px] text-zinc-600">
              {meta.description.length}/300 · è il testo che appare su Google e nelle anteprime dei
              link.
            </span>
          </label>
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Tema</h2>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["bg_color", "Sfondo"],
                ["text_color", "Testo"],
                ["accent_color", "Accento"],
                ["accent2", "Secondario"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-zinc-800 px-2 py-1.5">
                <input
                  type="color"
                  value={site.theme[key]}
                  onChange={(e) => setTheme({ [key]: e.target.value })}
                  className="h-7 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label={label}
                />
                <span className="min-w-0 text-[11px] text-zinc-400">{label}</span>
              </label>
            ))}
          </div>

          <label className="block">
            <span className="block text-[10.5px] uppercase tracking-wider text-zinc-500">Stile</span>
            <select
              value={site.theme.style}
              onChange={(e) => setTheme({ style: e.target.value as Site["theme"]["style"] })}
              className={`${field} mt-1`}
            >
              {THEME_STYLES.map((style) => (
                <option key={style} value={style}>
                  {STYLE_LABEL[style] ?? style}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-[10.5px] uppercase tracking-wider text-zinc-500">Font</span>
            <select
              value={site.theme.font}
              onChange={(e) => setTheme({ font: e.target.value as Site["theme"]["font"] })}
              className={`${field} mt-1`}
            >
              {THEME_FONTS.map((font) => (
                <option key={font} value={font}>
                  {FONT_LABEL[font] ?? font}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Titolare e dati fiscali
          </h2>
          <p className="text-[10.5px] leading-relaxed text-zinc-600">
            Compaiono nel footer della pagina: sono obbligatori se il sito è di un&apos;impresa o
            vende prodotti.
          </p>
          <input
            value={legal.businessName ?? ""}
            onChange={(e) => setLegal({ businessName: e.target.value })}
            maxLength={120}
            className={field}
            placeholder="Ragione sociale"
            aria-label="Ragione sociale"
          />
          <input
            value={legal.vat ?? ""}
            onChange={(e) => setLegal({ vat: e.target.value })}
            maxLength={40}
            className={field}
            placeholder="P.IVA / C.F."
            aria-label="Partita IVA o codice fiscale"
          />
          <input
            value={legal.address ?? ""}
            onChange={(e) => setLegal({ address: e.target.value })}
            maxLength={160}
            className={field}
            placeholder="Sede legale"
            aria-label="Sede legale"
          />
        </section>
      </div>
    </div>
  );
}
