"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SitePreview } from "@/components/SitePreview";
import type { StoredSite } from "@/lib/store";

export function SiteCard({ site, leads, unread = 0 }: { site: StoredSite; leads: number; unread?: number }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const clicks = Object.values(site.stats.clicks).reduce((a, b) => a + b, 0);

  async function copy() {
    const url = `${window.location.origin}/s/${site.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copia il link", url);
    }
  }

  async function remove() {
    if (!window.confirm(`Eliminare "${site.config.meta.title}"? L'operazione è definitiva.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setDeleting(false);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="pointer-events-none h-40 overflow-hidden border-b border-zinc-800 bg-zinc-950">
        <div style={{ transform: "scale(0.34)", transformOrigin: "top left", width: "294%" }}>
          <SitePreview site={site.config} />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h2 className="truncate text-sm font-semibold">{site.config.meta.title}</h2>
          <p className="truncate text-xs text-zinc-500">/s/{site.slug}</p>
        </div>

        <div className="flex flex-wrap gap-4 text-[11px] text-zinc-400">
          <span>{site.stats.views} visite</span>
          <span>{clicks} clic</span>
          <span>{leads} contatti</span>
          {unread > 0 && <span className="font-medium text-violet-300">{unread} nuovi</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/editor/${site.id}`}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
          >
            Modifica
          </Link>
          <button
            onClick={copy}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500"
          >
            {copied ? "Copiato ✓" : "Copia link"}
          </button>
          <Link
            href={`/sites/${site.id}`}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500"
          >
            Statistiche
          </Link>
          <button
            onClick={remove}
            disabled={deleting}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:border-red-900 hover:text-red-400 disabled:opacity-50"
          >
            {deleting ? "…" : "Elimina"}
          </button>
        </div>
      </div>
    </article>
  );
}
