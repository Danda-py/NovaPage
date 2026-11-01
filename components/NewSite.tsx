"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE_TEMPLATES, type SiteTemplateId } from "@/lib/site";

export function NewSite() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<SiteTemplateId>("essenziale");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || "La mia pagina", template }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.site?.id) {
      router.push(`/editor/${data.site.id}`);
      return;
    }
    // Il server spiega il limite del piano: mostriamo il suo messaggio.
    setError(typeof data.error === "string" ? data.error : "Creazione non riuscita: riprova.");
    setCreating(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
      >
        + Crea nuova landing
      </button>
    );
  }

  return (
    <form
      onSubmit={create}
      className="absolute right-5 top-16 z-20 w-[min(92vw,20rem)] space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl"
    >
      <div>
        <label className="block text-[10.5px] uppercase tracking-wider text-zinc-500">
          Nome dell&apos;attività
        </label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es. Pasticceria Aurora"
          className="mt-1 w-full rounded-xl bg-zinc-950 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500"
        />
      </div>

      <fieldset>
        <legend className="text-[10.5px] uppercase tracking-wider text-zinc-500">
          Da dove parti
        </legend>
        <div className="mt-1.5 space-y-1">
          {SITE_TEMPLATES.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] ${
                template === item.id
                  ? "border-violet-500/50 bg-violet-500/10 text-zinc-100"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="template"
                value={item.id}
                checked={template === item.id}
                onChange={() => setTemplate(item.id)}
                className="h-3.5 w-3.5 accent-violet-500"
              />
              <span className="min-w-0">
                <span className="font-medium">{item.label}</span>
                <span className="block text-[10.5px] text-zinc-500">{item.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-[11.5px] text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {creating ? "…" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
