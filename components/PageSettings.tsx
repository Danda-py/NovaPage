"use client";

import { useState } from "react";
import { FONT_CHOICES, isValidFamilyName } from "@/lib/fonts";
import {
  DEFAULT_LOOK,
  LOOK_OPTIONS,
  THEME_FONTS,
  THEME_FONT_ROLES,
  THEME_STYLES,
  THEME_STYLE_LABELS,
  type Site,
  type ThemeFontRole,
  type ThemeLook,
} from "@/lib/site";

const ROLE_LABEL: Record<ThemeFontRole, string> = {
  heading: "Titoli",
  body: "Testo",
  label: "Etichette e pulsanti",
};

/** Etichette degli assi dello stile personalizzato, con i valori letti da LOOK_OPTIONS. */
const LOOK_AXES: Array<{ key: keyof ThemeLook; label: string; values: Record<string, string> }> = [
  {
    key: "radius",
    label: "Spigoli",
    values: { sharp: "Netto", small: "Piccolo", medium: "Medio", large: "Ampio", pill: "A pillola" },
  },
  { key: "border", label: "Bordi", values: { none: "Nessuno", hairline: "Sottile", solid: "Accento" } },
  { key: "shadow", label: "Ombre", values: { none: "Nessuna", soft: "Morbida", strong: "Marcata" } },
  { key: "density", label: "Spaziatura", values: { compact: "Compatta", normal: "Normale", airy: "Ariosa" } },
  {
    key: "caps",
    label: "Maiuscole",
    values: { none: "Normali", labels: "Solo etichette", all: "Titoli ed etichette" },
  },
];

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
  const [fontName, setFontName] = useState("");
  const [fontError, setFontError] = useState("");

  const themeFonts = site.theme.fonts ?? {};
  const customFonts = site.theme.customFonts ?? [];
  const look: ThemeLook = { ...DEFAULT_LOOK, ...(site.theme.look ?? {}) };
  const fontOptions = [
    ...FONT_CHOICES.map((font) => ({ value: font.id, label: font.label })),
    ...customFonts.map((name) => ({ value: name, label: `${name} (importato)` })),
  ];

  function setMeta(patch: Partial<Site["meta"]>) {
    onChange({ ...site, meta: { ...meta, ...patch } });
  }

  function setTheme(patch: Partial<Site["theme"]>) {
    onChange({ ...site, theme: { ...site.theme, ...patch } });
  }

  function setLegal(patch: NonNullable<Site["legal"]>) {
    onChange({ ...site, legal: { ...legal, ...patch } });
  }

  /** Un ruolo senza voce usa il font base del tema. */
  function setRoleFont(role: ThemeFontRole, value: string) {
    const next = { ...themeFonts };
    if (value) next[role] = value;
    else delete next[role];
    setTheme({ fonts: Object.keys(next).length ? next : undefined });
  }

  function addFont(e: React.FormEvent) {
    e.preventDefault();
    const name = fontName.trim();
    if (!isValidFamilyName(name)) {
      setFontError("Nome non valido: lettere, numeri, spazi, punti o trattini.");
      return;
    }
    if (customFonts.some((font) => font.toLowerCase() === name.toLowerCase())) {
      setFontError("Hai già importato questo font.");
      return;
    }
    if (customFonts.length >= 6) {
      setFontError("Puoi importare al massimo 6 font.");
      return;
    }
    setTheme({ customFonts: [...customFonts, name] });
    setFontError("");
    setFontName("");
  }

  function removeFont(name: string) {
    const remaining = customFonts.filter((font) => font !== name);
    const fonts = { ...themeFonts };
    for (const role of THEME_FONT_ROLES) {
      if (fonts[role] === name) delete fonts[role];
    }
    setTheme({
      customFonts: remaining.length ? remaining : undefined,
      fonts: Object.keys(fonts).length ? fonts : undefined,
    });
  }

  function setLook(patch: Partial<ThemeLook>) {
    setTheme({ look: { ...look, ...patch } });
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
                  {THEME_STYLE_LABELS[style] ?? style}
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

          <div className="space-y-2 rounded-lg border border-zinc-800 p-2.5">
            <p className="text-[10.5px] uppercase tracking-wider text-zinc-400">Tipografia</p>
            <p className="text-[10.5px] leading-relaxed text-zinc-500">
              Un font per ruolo: senza una scelta, il ruolo usa il font base qui sopra.
            </p>
            {THEME_FONT_ROLES.map((role) => (
              <label key={role} className="block">
                <span className="block text-[10.5px] uppercase tracking-wider text-zinc-500">
                  {ROLE_LABEL[role]}
                </span>
                <select
                  value={themeFonts[role] ?? ""}
                  onChange={(e) => setRoleFont(role, e.target.value)}
                  className={`${field} mt-1`}
                >
                  <option value="">Font base del tema</option>
                  {fontOptions.map((font) => (
                    <option key={`${role}-${font.value}`} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <form onSubmit={addFont} className="space-y-1.5 border-t border-zinc-800 pt-2">
              <label className="block">
                <span className="block text-[10.5px] uppercase tracking-wider text-zinc-500">
                  Importa un font da Google Fonts
                </span>
                <div className="mt-1 flex gap-1.5">
                  <input
                    value={fontName}
                    onChange={(e) => {
                      setFontName(e.target.value);
                      setFontError("");
                    }}
                    maxLength={40}
                    placeholder="Es. Poppins"
                    className={field}
                    aria-label="Nome del font da importare"
                  />
                  <button
                    type="submit"
                    disabled={!fontName.trim()}
                    className="shrink-0 rounded-lg border border-zinc-700 px-2.5 text-[11px] text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
                  >
                    Aggiungi
                  </button>
                </div>
              </label>
              {fontError && (
                <p className="text-[11px] text-red-400" role="alert">
                  {fontError}
                </p>
              )}
              {customFonts.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {customFonts.map((name) => (
                    <li
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-2 py-0.5 text-[10.5px] text-zinc-300"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeFont(name)}
                        aria-label={`Rimuovi ${name}`}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] leading-relaxed text-zinc-500">
                Il font viene caricato da Google Fonts nella pagina pubblicata; serve che esista con
                quel nome esatto.
              </p>
            </form>
          </div>

          {site.theme.style === "custom" && (
            <div className="space-y-2 rounded-lg border border-zinc-800 p-2.5">
              <p className="text-[10.5px] uppercase tracking-wider text-zinc-400">
                Stile personalizzato
              </p>
              <p className="text-[10.5px] leading-relaxed text-zinc-500">
                Forma, bordi, profondità e ritmo: qui decidi tu, gli altri stili sono combinazioni
                già pronte.
              </p>
              {LOOK_AXES.map((axis) => (
                <label key={axis.key} className="block">
                  <span className="block text-[10.5px] uppercase tracking-wider text-zinc-500">
                    {axis.label}
                  </span>
                  <select
                    value={look[axis.key]}
                    onChange={(e) => setLook({ [axis.key]: e.target.value } as Partial<ThemeLook>)}
                    className={`${field} mt-1`}
                  >
                    {LOOK_OPTIONS[axis.key].map((value) => (
                      <option key={String(value)} value={String(value)}>
                        {axis.values[String(value)] ?? String(value)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
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
