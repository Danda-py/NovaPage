"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SiteSettings({
  siteId,
  title,
  slug,
  published,
}: {
  siteId: string;
  title: string;
  slug: string;
  published: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [value, setValue] = useState(slug);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPublished, setIsPublished] = useState(published);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState("");

  const dirty = name.trim() !== title || value.trim() !== slug;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setState("saving");
    const res = await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name.trim(), slug: value.trim() }),
    }).catch(() => null);
    // Senza il catch la rete assente lasciava il bottone su "…" per sempre.
    if (!res || !res.ok) {
      setState("error");
      return;
    }
    // Il server normalizza il link (minuscole, trattini, suffisso se già in uso):
    // mostriamo quello reale, altrimenti il campo sembra accettare altro.
    const data = await res.json().catch(() => ({}));
    if (typeof data.site?.slug === "string") setValue(data.site.slug);
    if (typeof data.site?.config?.meta?.title === "string") setName(data.site.config.meta.title);
    setState("saved");
    router.refresh();
  }

  async function togglePublished() {
    if (toggling) return;
    setToggling(true);
    const target = !isPublished;
    const res = await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: target }),
    }).catch(() => null);
    if (res?.ok) {
      setToggleError("");
      setIsPublished(target);
      router.refresh();
    } else {
      setToggleError("Aggiornamento non riuscito: riprova.");
    }
    setToggling(false);
  }

  const input =
    "w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5">
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500">Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500">Link pubblico</label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-zinc-500">/s/</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={input}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="nome-pagina"
            aria-describedby="slug-help"
          />
        </div>
        <p id="slug-help" className="text-[11px] text-zinc-500">
          Lettere minuscole, numeri e trattini. Cambiandolo, il link vecchio smette di funzionare.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || state === "saving"}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium hover:bg-zinc-700 disabled:opacity-40"
        >
          {state === "saving" ? "…" : "Salva"}
        </button>
        {state === "saved" && <span className="text-[11px] text-emerald-400">Salvato</span>}
        {state === "error" && <span className="text-[11px] text-red-400">Controlla i valori</span>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-200">
            {isPublished ? "Pagina pubblicata" : "Pagina in bozza"}
          </p>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            {isPublished
              ? "Visibile a chi ha il link ed elencata nella sitemap."
              : "Il link pubblico mostra la pagina 404 e non entra in sitemap."}
          </p>
        </div>
        <button
          type="button"
          onClick={togglePublished}
          disabled={toggling}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 ${
            isPublished
              ? "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
              : "bg-violet-600 text-white hover:bg-violet-500"
          }`}
        >
          {toggling ? "…" : isPublished ? "Metti in bozza" : "Pubblica"}
        </button>
      </div>
      {toggleError && <p className="text-[11.5px] text-red-400">{toggleError}</p>}
    </form>
  );
}
