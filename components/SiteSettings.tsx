"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SiteSettings({
  siteId,
  title,
  slug,
}: {
  siteId: string;
  title: string;
  slug: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [value, setValue] = useState(slug);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty = name.trim() !== title || value.trim() !== slug;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setState("saving");
    const res = await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name.trim(), slug: value.trim() }),
    });
    if (!res.ok) {
      setState("error");
      return;
    }
    setState("saved");
    router.refresh();
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
          <span className="text-xs text-zinc-500">/s/</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} className={input} />
        </div>
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
    </form>
  );
}
