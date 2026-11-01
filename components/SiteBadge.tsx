/**
 * Badge "Creato con NovaPage".
 *
 * Regole di design: sempre leggibile (chip scuro con contrasto alto), sempre in
 * un angolo, mai sopra i contenuti interattivi. Sta in un contenitore
 * `pointer-events-none`, quindi non cattura i click se non sulla pillola stessa:
 * il badge non "ruba" tocchi al sito dell'utente.
 */
export function SiteBadge({ href = "/?utm_source=badge&utm_medium=landing" }: { href?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="Creato con NovaPage"
      className="pointer-events-auto fixed bottom-[max(12px,env(safe-area-inset-bottom))] right-[max(12px,env(safe-area-inset-right))] z-40 inline-flex h-[30px] items-center gap-2 rounded-full border border-white/20 bg-zinc-950/85 px-3 text-[11px] font-medium tracking-tight text-zinc-100 shadow-[0_8px_28px_-14px_rgba(0,0,0,0.9)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-violet-400/60 hover:text-white"
    >
      <span aria-hidden className="h-2 w-2 rotate-45 rounded-[1px] bg-violet-400" />
      Creato con NovaPage
    </a>
  );
}

/** Versione statica per l'anteprima nell'editor: mostra il badge senza copiare il layout. */
export function SiteBadgePreview() {
  return (
    <div className="flex justify-end px-4 pb-4">
      <span className="inline-flex h-[30px] items-center gap-2 rounded-full border border-white/20 bg-zinc-950/85 px-3 text-[11px] font-medium text-zinc-100 backdrop-blur-md">
        <span aria-hidden className="h-2 w-2 rotate-45 rounded-[1px] bg-violet-400" />
        Creato con NovaPage
      </span>
    </div>
  );
}
