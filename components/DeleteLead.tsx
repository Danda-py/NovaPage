"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  async function remove() {
    if (
      !window.confirm(
        `Eliminare definitivamente il contatto${name ? ` di ${name}` : ""}? L'operazione non è reversibile.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, leadId }),
    });
    if (res.ok) {
      router.refresh();
      return;
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="text-[11px] text-zinc-600 transition-colors hover:text-red-400 disabled:opacity-50"
      aria-label={`Elimina contatto${name ? ` di ${name}` : ""}`}
    >
      {busy ? "…" : "Elimina"}
    </button>
  );
}
