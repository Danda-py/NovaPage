"use client";

import { useEffect } from "react";
import { googleFontsHref } from "@/lib/fonts";
import type { Theme } from "@/lib/site";

/**
 * Anteprima fedele: l'editor carica le stesse famiglie della pagina pubblicata,
 * altrimenti i font scelti per ruolo si vedrebbero solo dopo la pubblicazione.
 */
export function FontLoader({ theme }: { theme: Theme }) {
  const href = googleFontsHref({ fonts: theme.fonts, customFonts: theme.customFonts });

  useEffect(() => {
    const id = "np-theme-fonts";
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    if (!href) {
      existing?.remove();
      return;
    }
    if (existing) {
      if (existing.href !== href) existing.href = href;
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [href]);

  return null;
}
