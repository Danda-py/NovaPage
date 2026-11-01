"use client";

import { useEffect } from "react";

function track(siteId: string, label?: string) {
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteId, label }),
  }).catch(() => undefined);
}

/**
 * Tutto il JS della pagina pubblica sta qui: la landing vera e propria è
 * renderizzata dal server e non viene idratata, quindi il browser non deve
 * scaricare ed eseguire il codice dei blocchi.
 */
export function SiteTracker({ siteId }: { siteId: string }) {
  useEffect(() => {
    // una visita per caricamento pagina; nessun identificativo salvato sul dispositivo
    try {
      const key = `np_view_${siteId}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        track(siteId);
      }
    } catch {
      track(siteId);
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      // Un pulsante con icone e testi annidati produce etichette tipo "CACasa":
      // aria-label, quando c'è, è già la descrizione leggibile.
      const label =
        anchor.getAttribute("aria-label")?.trim() ||
        anchor.textContent?.replace(/\s+/g, " ").trim().slice(0, 60) ||
        "link";
      track(siteId, label);
    };

    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, [siteId]);

  return null;
}
