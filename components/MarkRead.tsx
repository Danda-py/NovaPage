"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { safeFetch } from "@/lib/http";

export function MarkRead({ siteId, unread }: { siteId: string; unread: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (unread === 0) return null;

  async function mark() {
    setBusy(true);
    setError("");
    const res = await safeFetch("/api/leads/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    // Aggiornare la pagina dopo un errore mostrerebbe ancora i contatti come
    // non letti, facendo sembrare il pulsante rotto.
    if (!res?.ok) {
      setError(res ? "Non aggiornato: riprova" : "Connessione assente");
      setBusy(false);
      return;
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        onClick={mark}
        disabled={busy}
        className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
      >
        {busy ? "…" : `Segna ${unread} come letti`}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </span>
  );
}
