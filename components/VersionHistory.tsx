"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SiteVersion } from "@/lib/store";

function when(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Cronologia delle modifiche con ripristino. Le date arrivano già formattabili
 * lato client: niente differenze tra server e browser nell'idratazione.
 */
export function VersionHistory({
  siteId,
  versions,
}: {
  siteId: string;
  versions: SiteVersion[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function restore(versionId: string) {
    if (busy) return;
    setBusy(versionId);
    setError("");
    const res = await fetch(`/api/sites/${siteId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Ripristino non riuscito");
      setBusy(null);
      return;
    }
    router.refresh();
    setBusy(null);
  }

  if (versions.length === 0) {
    return (
      <p className="mt-2 text-xs text-zinc-500">
        Ancora nessuna versione: la prima bozza verrà salvata alla prossima modifica della pagina.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-3 divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
        {versions.map((version, index) => (
          <li key={version.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-[12.5px] text-zinc-300">{when(version.createdAt)}</p>
              <p className="text-[10.5px] text-zinc-600">
                {index === 0 ? "versione più recente" : `${index} modifiche fa`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => restore(version.id)}
              disabled={busy !== null}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-violet-500/60 hover:text-violet-300 disabled:opacity-40"
            >
              {busy === version.id ? "…" : "Ripristina"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-[11.5px] text-red-400">{error}</p>}
    </>
  );
}
