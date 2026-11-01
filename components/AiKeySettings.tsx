"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/http";

/**
 * La chiave della piattaforma è condivisa da tutti gli account: chi vuole
 * indipendenza (e spese sul proprio progetto Google) può usarne una sua.
 */
export function AiKeySettings({ tail }: { tail: string | null }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const field =
    "w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const value = key.trim();
    if (value.length < 20) {
      setError("Incolla la chiave completa di Google AI Studio");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    const res = await safeFetch("/api/account/ai-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: value }),
    });
    if (!res) {
      setError("Connessione assente: riprova.");
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Chiave non salvata");
      return;
    }
    setKey("");
    setNote("Chiave salvata: la chat usa la tua chiave da adesso.");
    router.refresh();
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNote("");
    const res = await safeFetch("/api/account/ai-key", { method: "DELETE" });
    if (!res) {
      setError("Connessione assente: riprova.");
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setError("Rimozione non riuscita");
      return;
    }
    setNote("Chiave personale rimossa.");
    router.refresh();
  }

  return (
    <div>
      {tail ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/30 px-2.5 py-1 text-[11px] text-emerald-300">
            <span aria-hidden>●</span> Attiva · termina per {tail}
          </span>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-[12px] text-zinc-400 hover:text-red-400 disabled:opacity-50"
          >
            Rimuovi
          </button>
        </div>
      ) : (
        <p className="text-[11.5px] leading-relaxed text-zinc-500">
          Nessuna chiave personale: usi quella della piattaforma. Puoi aggiungerne una tua qui
          sotto.
        </p>
      )}

      <form onSubmit={save} className="mt-3 space-y-2">
        <label className="block">
          <span className="block text-[10.5px] uppercase tracking-wider text-zinc-500">
            {tail ? "Sostituisci la chiave" : "Chiave Gemini (Google AI Studio)"}
          </span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError("");
            }}
            className={`${field} mt-1 font-mono text-[12.5px]`}
            placeholder="AQ.… oppure AIza…"
            aria-label="Chiave Gemini"
          />
        </label>
        <p className="text-[10.5px] leading-relaxed text-zinc-500">
          Si salva cifrata (AES-256-GCM) e non viene più mostrata. Serve solo per generare le tue
          pagine; revocarla da Google la disattiva subito.{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer noopener"
            className="text-violet-400 hover:underline"
          >
            Crea una chiave
          </a>
          .
        </p>
        {error && (
          <p className="text-[11.5px] text-red-400" role="alert">
            {error}
          </p>
        )}
        {note && <p className="text-[11.5px] text-emerald-400">{note}</p>}
        <button
          type="submit"
          disabled={busy || !key.trim()}
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? "Verifico…" : "Salva chiave"}
        </button>
      </form>
    </div>
  );
}
