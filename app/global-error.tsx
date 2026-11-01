"use client";

import "./globals.css";

/** Errore nel root layout: deve contenere html e body propri. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body className="bg-zinc-950 text-zinc-100">
        <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Servizio momentaneamente non disponibile</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
            Si è verificato un errore imprevisto. Riprova tra qualche istante.
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
      </body>
    </html>
  );
}
