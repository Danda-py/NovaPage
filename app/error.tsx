"use client";

import { Brand } from "@/components/Brand";

/**
 * Confine di errore dei segmenti: evita la schermata grezza di Next quando un
 * server component fallisce (database lento, query in errore).
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
      <Brand />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Qualcosa è andato storto</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
        La pagina non è riuscita a caricarsi. Puoi riprovare: se il problema continua, torna tra
        qualche minuto.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-zinc-600">codice errore: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
      >
        Riprova
      </button>
    </div>
  );
}
