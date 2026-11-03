"use client";

import Link from "next/link";
import { useState } from "react";
import { safeFetch } from "@/lib/http";
import { Brand } from "@/components/Brand";

export function ConfirmEmail({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (busy || done) return;
    setBusy(true);
    setError("");
    const res = await safeFetch("/api/account/email/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res) {
      setError("Connessione assente: riprova.");
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Conferma non riuscita");
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-5 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Brand />
        </div>
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h1 className="text-xl font-semibold tracking-tight">Conferma il nuovo indirizzo</h1>
          {done ? (
            <>
              <p className="mt-2 text-[13px] leading-relaxed text-emerald-400">
                Email aggiornata. Per sicurezza tutte le sessioni sono state disconnesse: accedi di
                nuovo con il nuovo indirizzo.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Vai all&apos;accesso
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                Clicca il pulsante per rendere effettivo il nuovo indirizzo. Il link vale una sola
                volta e scade entro un&apos;ora.
              </p>
              {!token ? (
                <p className="mt-3 text-[12.5px] text-red-400">
                  Link incompleto: apri di nuovo quello ricevuto via email.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy}
                  className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {busy ? "…" : "Conferma email"}
                </button>
              )}
              {error && (
                <p role="alert" className="mt-3 text-[12px] text-red-400">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
