"use client";

import { useEffect } from "react";
import { SitePreview } from "@/components/SitePreview";
import type { Site } from "@/lib/site";

function track(siteId: string, label?: string) {
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteId, label }),
  }).catch(() => undefined);
}

export function PublicSite({ site, siteId }: { site: Site; siteId: string }) {
  useEffect(() => {
    // una visita per caricamento pagina; nessun identificativo salvato sul dispositivo
    const key = `np_view_${siteId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    track(siteId);
  }, [siteId]);

  return (
    <div
      onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest("a");
        if (!anchor) return;
        const label = anchor.textContent?.trim().slice(0, 60) || "link";
        track(siteId, label);
      }}
    >
      <SitePreview site={site} siteId={siteId} />
    </div>
  );
}
