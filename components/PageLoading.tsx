/**
 * Stato di caricamento delle route dinamiche (dashboard, editor, statistiche).
 * Vive qui e non alla radice: un confine di caricamento sopra `/s/[slug]` apre lo
 * streaming prima di `notFound()`, e una pagina inesistente finirebbe servita con 200.
 */
export default function PageLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950">
      <div className="flex items-center gap-2.5 text-xs text-zinc-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
        Caricamento…
      </div>
    </div>
  );
}
