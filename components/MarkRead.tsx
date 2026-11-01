"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkRead({ siteId, unread }: { siteId: string; unread: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (unread === 0) return null;

  async function mark() {
    setBusy(true);
    await fetch("/api/leads/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    }).catch(() => undefined);
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={mark}
      disabled={busy}
      className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
    >
      {busy ? "…" : `Segna ${unread} come letti`}
    </button>
  );
}
