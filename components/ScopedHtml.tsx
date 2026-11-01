"use client";

import { useEffect, useRef } from "react";

/**
 * Anteprima dell'HTML libero dentro un shadow DOM.
 *
 * Nella pagina pubblicata quel markup è la pagina intera, quindi i suoi <style>
 * valgono per tutto il documento. Nell'editor no: lì il CSS generato finiva per
 * ridipingere l'interfaccia (titoli serif dorati, campi enormi) e rendeva
 * illeggibile il pannello. Lo shadow DOM tiene il foglio di stile dentro
 * l'anteprima e lascia intatta l'interfaccia.
 */
export function ScopedHtml({ html, className }: { html: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const shadow = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const root = shadow.current ?? element.attachShadow({ mode: "open" });
    shadow.current = root;
    // `<base>` serve ai link relativi del frammento, che qui non hanno un documento proprio.
    root.innerHTML = `<style>:host{display:block}</style><base target="_blank">${html}`;
  }, [html]);

  return <div ref={host} className={className} />;
}
