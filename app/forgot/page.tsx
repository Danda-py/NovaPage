"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/Brand";
import { safeFetch } from "@/lib/http";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "unconfigured">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    setError("");
    const res = await safeFetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res) {
      setError("Connessione assente: riprova.");
      setState("idle");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Qualcosa è andato storto");
      setState("idle");
      return;
    }
    setState(data.reason === "unconfigured" ? "unconfigured" : "sent");
  }

  const field =
    "w-full rounded-xl bg-zinc-950 px-3.5 py-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <Brand />
          <Link href="/login" className="inline-flex min-h-9 items-center text-xs text-zinc-400 hover:text-zinc-200">
            ← Accedi
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Password dimenticata</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Inserisci l&apos;email del tuo account: ti inviamo un link per scegliere una nuova password.
        </p>

        {state === "sent" || state === "unconfigured" ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-sm font-medium text-zinc-200">
              {state === "sent"
                ? "Se l'email è registrata riceverai un link a breve."
                : "Link non inviato: l'invio email non è configurato su questa installazione."}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
              {state === "sent"
                ? "Controlla anche la cartella spam. Il link scade dopo un'ora."
                : "Serve RESEND_API_KEY e EMAIL_FROM nelle variabili d'ambiente per inviare il messaggio."}
            </p>
            <Link href="/login" className="mt-4 inline-block text-xs text-violet-400 hover:underline">
              Torna all&apos;accesso
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@attivita.it"
                className={field}
                required
              />
            </div>

            {error && <p className="text-[12px] text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={state === "busy"}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {state === "busy" ? "…" : "Invia link di reset"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
