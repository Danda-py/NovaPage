"use client";

import { useEffect, useRef, useState } from "react";
import {
  BLOCK_LAYOUTS,
  BUTTON_ICONS,
  THEME_FONTS,
  THEME_STYLES,
  type Block,
  type BlockType,
  type LinkButton,
  type Product,
  type Site,
  type Theme,
} from "@/lib/site";

const LABELS: Record<BlockType, string> = {
  hero: "Intestazione",
  banner: "Banner",
  links: "Pulsanti link",
  catalog: "Catalogo",
  hours: "Orari",
  gallery: "Galleria",
  info: "Informazioni",
  form: "Modulo contatti",
  contact: "Contatti",
};

const input =
  "w-full rounded-lg bg-zinc-950 px-2.5 py-2 text-[12.5px] outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

const label = "block text-[10px] uppercase tracking-wider text-zinc-500";

function Field({
  value,
  onChange,
  placeholder,
  textarea,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
}) {
  if (textarea) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={`${input} resize-none`}
      />
    );
  }
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={input}
    />
  );
}

function ImageField({
  url,
  onChange,
  onError,
  round,
}: {
  url?: string;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  round?: boolean;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    setBusy(true);
    const body = new FormData();
    body.append("file", f);
    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        onError(data.error ?? "Caricamento non riuscito");
      } else {
        onChange(data.url);
      }
    } catch {
      onError("Caricamento non riuscito");
    }
    setBusy(false);
    if (file.current) file.current.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-zinc-900 text-[10px] text-zinc-600 ring-1 ring-zinc-800 ${
          round ? "rounded-full" : "rounded-lg"
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          "foto"
        )}
      </div>
      <input
        ref={file}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
      <button
        type="button"
        onClick={() => file.current?.click()}
        disabled={busy}
        className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
      >
        {busy ? "…" : url ? "Sostituisci" : "Carica foto"}
      </button>
      {url && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-[11px] text-zinc-500 hover:text-red-400"
        >
          Rimuovi
        </button>
      )}
    </div>
  );
}

export function ManualEditor({
  site,
  onChange,
  openId,
  onOpenChange,
}: {
  site: Site;
  onChange: (next: Site) => void;
  openId: string | null;
  onOpenChange: (blockId: string | null) => void;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hexDraft, setHexDraft] = useState<Record<string, string>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Solo sincronizzazione con il DOM: nessuno stato derivato qui dentro.
  useEffect(() => {
    if (!openId) return;
    const el = panelRef.current?.querySelector(`[data-editor-block="${openId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => {
      el?.querySelector<HTMLInputElement>("input, textarea")?.focus();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [openId]);

  function commit(next: Site) {
    onChange(next);
  }

  function patchBlock(blockId: string, data: Partial<Block["data"]>) {
    const next = structuredClone(site);
    const block = next.blocks.find((b) => b.id === blockId);
    if (!block) return;
    block.data = { ...block.data, ...data };
    commit(next);
  }

  function patchTheme(patch: Partial<Theme>) {
    const next = structuredClone(site);
    next.theme = { ...next.theme, ...patch };
    commit(next);
  }

  function setColor(key: "bg_color" | "text_color" | "accent_color" | "accent2", value: string) {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
    patchTheme({ [key]: value } as Partial<Theme>);
  }

  function move(blockId: string, to: number) {
    const next = structuredClone(site);
    const from = next.blocks.findIndex((b) => b.id === blockId);
    if (from < 0) return;
    const [block] = next.blocks.splice(from, 1);
    next.blocks.splice(Math.max(0, Math.min(to, next.blocks.length)), 0, block);
    commit(next);
  }

  function remove(blockId: string) {
    const next = structuredClone(site);
    next.blocks = next.blocks.filter((b) => b.id !== blockId);
    commit(next);
    if (openId === blockId) onOpenChange(null);
  }

  function moveTo(fromId: string, toId: string) {
    if (fromId === toId) return;
    const to = site.blocks.findIndex((b) => b.id === toId);
    move(fromId, to);
  }

  const colorKeys = [
    { key: "bg_color", title: "Sfondo" },
    { key: "text_color", title: "Testo" },
    { key: "accent_color", title: "Accento" },
    { key: "accent2", title: "Secondo accento" },
  ] as const;

  return (
    <div ref={panelRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
      <div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Modifica a mano: le stesse modifiche della chat, sullo stesso contenuto. L&apos;anteprima
          si aggiorna mentre scrivi.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-[11.5px] text-red-300">
          {error}
          <button type="button" onClick={() => setError("")} className="ml-2 text-red-400 underline">
            chiudi
          </button>
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Pagina</h2>
        <div className="space-y-1.5">
          <span className={label}>Titolo</span>
          <Field
            value={site.meta.title}
            onChange={(value) => {
              const next = structuredClone(site);
              next.meta.title = value;
              commit(next);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <span className={label}>Descrizione</span>
          <Field
            value={site.meta.description}
            onChange={(value) => {
              const next = structuredClone(site);
              next.meta.description = value;
              commit(next);
            }}
            textarea
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Dati attività
        </h2>
        <p className="text-[10.5px] leading-relaxed text-zinc-600">
          Commercianti e professionisti: ragione sociale, P.IVA e sede sono obbligatorie per legge e
          compaiono nel footer della pagina pubblicata.
        </p>
        {(
          [
            ["businessName", "Ragione sociale"],
            ["vat", "Partita IVA"],
            ["address", "Sede legale"],
          ] as const
        ).map(([key, title]) => (
          <div key={key} className="space-y-1">
            <span className={label}>{title}</span>
            <Field
              value={site.legal?.[key] ?? ""}
              onChange={(value) => {
                const next = structuredClone(site);
                next.legal = { ...next.legal, [key]: value };
                commit(next);
              }}
            />
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Struttura
          </h2>
          <span className="text-[10px] text-zinc-600">trascina per riordinare</span>
        </div>

        {site.blocks.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-[11.5px] text-zinc-500">
            Nessun blocco. Chiedi in chat di aggiungerne uno.
          </p>
        )}

        <ul className="space-y-1.5">
          {site.blocks.map((block, index) => {
            const open = openId === block.id;
            return (
              <li
                key={block.id}
                data-editor-block={block.id}
                draggable
                onDragStart={() => setDragged(block.id)}
                onDragEnd={() => {
                  setDragged(null);
                  setDragOver(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(block.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragged) moveTo(dragged, block.id);
                  setDragged(null);
                  setDragOver(null);
                }}
                className={`rounded-xl border bg-zinc-900/50 ${
                  dragOver === block.id && dragged !== block.id
                    ? "border-violet-500"
                    : "border-zinc-800"
                } ${dragged === block.id ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-1.5 px-2 py-2">
                  <span
                    className="cursor-grab select-none px-1 text-[13px] leading-none text-zinc-600"
                    title="Trascina per riordinare"
                    aria-hidden
                  >
                    ⠿
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenChange(open ? null : block.id)}
                    className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium text-zinc-200"
                    aria-expanded={open}
                  >
                    {LABELS[block.type]}
                    <span className="ml-2 text-[10px] font-normal text-zinc-600">
                      {index + 1}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(block.id, index - 1)}
                    disabled={index === 0}
                    className="px-1 text-[11px] text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                    aria-label="Sposta su"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(block.id, index + 1)}
                    disabled={index === site.blocks.length - 1}
                    className="px-1 text-[11px] text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                    aria-label="Sposta giù"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(block.id)}
                    className="px-1 text-[11px] text-zinc-600 hover:text-red-400"
                    aria-label={`Elimina ${LABELS[block.type]}`}
                  >
                    ✕
                  </button>
                </div>

                {open && (
                  <div className="space-y-2 border-t border-zinc-800 p-2.5">
                    <BlockFields
                      block={block}
                      theme={site.theme}
                      onChange={(data) => patchBlock(block.id, data)}
                      onError={setError}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Colori</h2>
        <div className="grid grid-cols-2 gap-2">
          {colorKeys.map(({ key, title }) => (
            <div key={key} className="space-y-1">
              <span className={label}>{title}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={site.theme[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-zinc-700 bg-transparent"
                  aria-label={title}
                />
                <input
                  value={hexDraft[key] ?? site.theme[key]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setHexDraft((prev) => ({ ...prev, [key]: value }));
                    if (/^#[0-9a-fA-F]{6}$/.test(value)) setColor(key, value);
                  }}
                  onBlur={() => setHexDraft((prev) => ({ ...prev, [key]: site.theme[key] }))}
                  className="min-w-0 flex-1 rounded-md bg-zinc-950 px-2 py-1.5 font-mono text-[11px] outline-none ring-1 ring-zinc-800 focus:ring-violet-500"
                  spellCheck={false}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className={label}>Stile</span>
            <select
              value={site.theme.style}
              onChange={(e) => patchTheme({ style: e.target.value as Theme["style"] })}
              className={input}
            >
              {THEME_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <span className={label}>Font</span>
            <select
              value={site.theme.font}
              onChange={(e) => patchTheme({ font: e.target.value as Theme["font"] })}
              className={input}
            >
              {THEME_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}

function BlockFields({
  block,
  theme,
  onChange,
  onError,
}: {
  block: Block;
  theme: Theme;
  onChange: (data: Partial<Block["data"]>) => void;
  onError: (message: string) => void;
}) {
  const d = block.data;

  const text = (key: "title" | "subtitle" | "badge" | "text" | "phone" | "email" | "whatsapp" | "address", title: string, placeholder?: string) => (
    <div className="space-y-1">
      <span className={label}>{title}</span>
      <Field
        value={d[key] ?? ""}
        onChange={(value) => onChange({ [key]: value })}
        placeholder={placeholder}
        textarea={key === "text"}
      />
    </div>
  );

  const products = d.items ?? [];
  const buttons = d.buttons ?? [];
  const hours = d.hours ?? [];
  const rows = d.rows ?? [];
  const images = d.images ?? [];
  const imageAlts = d.imageAlts ?? [];

  return (
    <>
      {(block.type === "hero" || block.type === "form" || block.type === "contact" || block.type === "catalog" || block.type === "gallery" || block.type === "hours" || block.type === "info") &&
        text("title", "Titolo")}
      {(block.type === "form" || block.type === "contact") && text("text", "Testo")}
      {block.type === "hero" && text("subtitle", "Sottotitolo")}
      {block.type === "hero" && text("badge", "Etichetta")}
      {block.type === "banner" && text("text", "Testo del banner")}
      {block.type === "contact" && text("phone", "Telefono", "333 1234567")}
      {block.type === "contact" && text("email", "Email", "ciao@attivita.it")}
      {block.type === "contact" && text("whatsapp", "WhatsApp", "393331234567")}
      {block.type === "contact" && text("address", "Indirizzo", "Via Roma 1, Milano")}

      {block.type === "hero" && (
        <div className="space-y-1">
          <span className={label}>Foto profilo</span>
          <ImageField url={d.avatar} onChange={(url) => onChange({ avatar: url })} onError={onError} round />
        </div>
      )}

      {block.type === "catalog" && (
        <div className="space-y-1">
          <span className={label}>Disposizione</span>
          <select
            value={d.layout ?? "grid"}
            onChange={(e) => onChange({ layout: e.target.value as Block["data"]["layout"] })}
            className={input}
          >
            {BLOCK_LAYOUTS.map((layout) => (
              <option key={layout} value={layout}>
                {layout}
              </option>
            ))}
          </select>
        </div>
      )}

      {block.type === "catalog" && (
        <div className="space-y-2">
          <span className={label}>Elementi</span>
          {products.map((product, index) => (
            <ProductFields
              key={product.id}
              product={product}
              onChange={(patch) => {
                const next = products.map((p, i) => (i === index ? { ...p, ...patch } : p));
                onChange({ items: next });
              }}
              onError={onError}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                items: [
                  ...products,
                  { id: `prod_${Math.random().toString(36).slice(2, 8)}`, name: "Nuovo elemento", price: "" },
                ],
              })
            }
            className="w-full rounded-lg border border-dashed border-zinc-700 py-1.5 text-[11px] text-zinc-400 hover:border-violet-500 hover:text-violet-300"
          >
            + Aggiungi elemento
          </button>
        </div>
      )}

      {block.type === "links" && (
        <div className="space-y-2">
          <span className={label}>Pulsanti</span>
          {buttons.map((button, index) => (
            <div key={index} className="space-y-1.5 rounded-lg border border-zinc-800 p-2">
              <Field
                value={button.label}
                onChange={(value) => {
                  const next = buttons.map((b, i) => (i === index ? { ...b, label: value } : b));
                  onChange({ buttons: next });
                }}
                placeholder="Testo del pulsante"
              />
              <Field
                value={button.url}
                onChange={(value) => {
                  const next = buttons.map((b, i) => (i === index ? { ...b, url: value } : b));
                  onChange({ buttons: next });
                }}
                placeholder="https://…"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  aria-label={`Colore di ${button.label}`}
                  value={button.color ?? theme.accent_color}
                  onChange={(e) => {
                    const next = buttons.map((b, i) =>
                      i === index ? { ...b, color: e.target.value } : b,
                    );
                    onChange({ buttons: next });
                  }}
                  className="h-7 w-8 shrink-0 cursor-pointer rounded-md border border-zinc-700 bg-transparent"
                  title="Colore del pulsante"
                />
                <span className="text-[10px] text-zinc-500">
                  {button.color ? button.color : "colore del tema"}
                </span>
                {button.color && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = buttons.map((b, i) =>
                        i === index ? { ...b, color: undefined } : b,
                      );
                      onChange({ buttons: next });
                    }}
                    className="text-[10px] text-zinc-500 underline hover:text-zinc-300"
                  >
                    usa tema
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={button.icon ?? "none"}
                  onChange={(e) => {
                    const next = buttons.map((b, i) =>
                      i === index ? { ...b, icon: e.target.value as LinkButton["icon"] } : b,
                    );
                    onChange({ buttons: next });
                  }}
                  className={input}
                  aria-label="Icona"
                >
                  {BUTTON_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChange({ buttons: buttons.filter((_, i) => i !== index) })}
                  className="px-1 text-[11px] text-zinc-600 hover:text-red-400"
                  aria-label="Elimina pulsante"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                buttons: [...buttons, { label: "Nuovo link", url: "", icon: "globe", variant: "ghost" }],
              })
            }
            className="w-full rounded-lg border border-dashed border-zinc-700 py-1.5 text-[11px] text-zinc-400 hover:border-violet-500 hover:text-violet-300"
          >
            + Aggiungi pulsante
          </button>
        </div>
      )}

      {block.type === "hours" && (
        <div className="space-y-2">
          <span className={label}>Orari</span>
          {hours.map((row, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Field
                value={row.day}
                onChange={(value) =>
                  onChange({ hours: hours.map((h, i) => (i === index ? { ...h, day: value } : h)) })
                }
                placeholder="Lunedì"
              />
              <Field
                value={row.time}
                onChange={(value) =>
                  onChange({ hours: hours.map((h, i) => (i === index ? { ...h, time: value } : h)) })
                }
                placeholder="9:00 – 19:00"
              />
              <button
                type="button"
                onClick={() => onChange({ hours: hours.filter((_, i) => i !== index) })}
                className="px-1 text-[11px] text-zinc-600 hover:text-red-400"
                aria-label="Elimina orario"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ hours: [...hours, { day: "Lunedì", time: "9:00 – 19:00" }] })}
            className="w-full rounded-lg border border-dashed border-zinc-700 py-1.5 text-[11px] text-zinc-400 hover:border-violet-500 hover:text-violet-300"
          >
            + Aggiungi orario
          </button>
        </div>
      )}

      {block.type === "info" && (
        <div className="space-y-2">
          <span className={label}>Righe</span>
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Field
                value={row.label}
                onChange={(value) =>
                  onChange({ rows: rows.map((r, i) => (i === index ? { ...r, label: value } : r)) })
                }
                placeholder="Etichetta"
              />
              <Field
                value={row.value}
                onChange={(value) =>
                  onChange({ rows: rows.map((r, i) => (i === index ? { ...r, value } : r)) })
                }
                placeholder="Valore"
              />
              <button
                type="button"
                onClick={() => onChange({ rows: rows.filter((_, i) => i !== index) })}
                className="px-1 text-[11px] text-zinc-600 hover:text-red-400"
                aria-label="Elimina riga"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ rows: [...rows, { label: "Etichetta", value: "Valore" }] })}
            className="w-full rounded-lg border border-dashed border-zinc-700 py-1.5 text-[11px] text-zinc-400 hover:border-violet-500 hover:text-violet-300"
          >
            + Aggiungi riga
          </button>
        </div>
      )}

      {block.type === "gallery" && (
        <div className="space-y-2">
          <span className={label}>Foto</span>
          <div className="space-y-1.5">
            {images.map((src, index) => (
              <div key={`${src}-${index}`} className="flex items-center gap-2 rounded-lg border border-zinc-800 p-1.5">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-zinc-800" />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        images: images.filter((_, i) => i !== index),
                        imageAlts: imageAlts.filter((_, i) => i !== index),
                      })
                    }
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[9px] text-zinc-300 ring-1 ring-zinc-700"
                    aria-label="Rimuovi foto"
                  >
                    ✕
                  </button>
                </div>
                <Field
                  value={imageAlts[index] ?? ""}
                  onChange={(value) => {
                    const next = [...imageAlts];
                    next[index] = value;
                    onChange({ imageAlts: next });
                  }}
                  placeholder="Testo alternativo (opzionale)"
                />
              </div>
            ))}
          </div>
          <ImageField
            url={undefined}
            onChange={(url) =>
              url &&
              onChange({
                images: [...images, url].slice(0, 12),
                // Resta allineato agli indici: la nuova foto parte senza alt.
                imageAlts: [...imageAlts, ""].slice(0, 12),
              })
            }
            onError={onError}
          />
        </div>
      )}
    </>
  );
}

function ProductFields({
  product,
  onChange,
  onError,
}: {
  product: Product;
  onChange: (patch: Partial<Product>) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="space-y-1.5 rounded-lg border border-zinc-800 p-2">
      <Field value={product.name} onChange={(name) => onChange({ name })} placeholder="Nome" />
      <Field
        value={product.description ?? ""}
        onChange={(description) => onChange({ description })}
        placeholder="Descrizione (opzionale)"
        textarea
      />
      <div className="flex items-center gap-1.5">
        <Field value={product.price} onChange={(price) => onChange({ price })} placeholder="Prezzo" />
        <Field value={product.status ?? ""} onChange={(status) => onChange({ status })} placeholder="Stato" />
      </div>
      <div className="flex items-center gap-1.5">
        <Field
          value={product.compareAtPrice ?? ""}
          onChange={(compareAtPrice) => onChange({ compareAtPrice })}
          placeholder="Prezzo pieno (se scontato)"
        />
        <Field
          value={product.lowestPrice30 ?? ""}
          onChange={(lowestPrice30) => onChange({ lowestPrice30 })}
          placeholder="Minimo 30 gg"
        />
      </div>
      <p className="text-[10px] leading-relaxed text-zinc-600">
        Con uno sconto indica il prezzo più basso dei 30 giorni precedenti: è obbligatorio
        (direttiva Omnibus).
      </p>
      <ImageField url={product.image} onChange={(image) => onChange({ image })} onError={onError} />
      <div className="space-y-1">
        <span className={label}>Testo alternativo foto</span>
        <Field
          value={product.alt ?? ""}
          onChange={(alt) => onChange({ alt })}
          placeholder="es. Felpa nera con cappuccio"
        />
      </div>
    </div>
  );
}

