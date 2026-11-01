"use client";

import { useEffect } from "react";
import { sanitizeHtml } from "@/lib/html";

function track(siteId: string, label?: string) {
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteId, label }),
  }).catch(() => undefined);
}

/**
 * Landing in HTML libero. Il markup è reso inline (non in un iframe) perché il
 * contenuto deve essere indicizzabile; la sicurezza arriva dalla sanificazione
 * applicata qui e al salvataggio, non dal contesto di esecuzione.
 */
export function CustomPage({
  html,
  siteId,
  trackViews = true,
}: {
  html: string;
  siteId: string;
  trackViews?: boolean;
}) {
  useEffect(() => {
    if (!trackViews) return;
    // una visita per caricamento pagina; nessun identificativo salvato sul dispositivo
    const key = `np_view_${siteId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    track(siteId);
  }, [siteId, trackViews]);

  return (
    <div
      onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest("a");
        if (!anchor) return;
        const label = anchor.textContent?.trim().slice(0, 60) || "link";
        track(siteId, label);
      }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
