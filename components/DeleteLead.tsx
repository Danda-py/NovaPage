"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { safeFetch } from "@/lib/http";

export function DeleteLead({
  siteId,
  leadId,
  name,
}: {
  siteId: string;
  leadId: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (
      !window.confirm(
        `Eliminare definitivamente il contatto${name ? ` di ${name}` : ""}? L'operazione non è reversibile.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    const res = await safeFetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, leadId }),
    });
    if (res?.ok) {
      router.refresh();
      return;
    }
    // Il contatto non è sparito: va detto, altrimenti sembra solo lento.
    setError(res ? "Eliminazione non riuscita: riprova." : "Connessione assente: riprova.");
    setBusy(false);
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="text-[11px] text-zinc-400 transition-colors hover:text-red-400 disabled:opacity-50"
        aria-label={`Elimina contatto${name ? ` di ${name}` : ""}`}
        aria-describedby={error ? `err_${leadId}` : undefined}
      >
        {busy ? "…" : "Elimina"}
      </button>
      {error && (
        <span id={`err_${leadId}`} className="text-[10px] text-red-400">
          {error}
        </span>
      )}
    </span>
  );
}
