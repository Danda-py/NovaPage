"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewSite() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || "La mia pagina" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.site?.id) router.push(`/editor/${data.site.id}`);
    else setCreating(false);
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
    <form onSubmit={create} className="flex items-center gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nome dell'attività"
        className="w-48 rounded-xl bg-zinc-900 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500"
      />
      <button
        type="submit"
        disabled={creating}
        className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {creating ? "…" : "Crea"}
      </button>
    </form>
  );
}
