"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/Brand";

export default function ResetPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  // Il token sta nell'URL: lo leggiamo dal browser per evitare un parsing lato server.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri");
      return;
    }
    if (password !== confirm) {
      setError("Le due password non coincidono");
      return;
    }
    setState("busy");
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Link non valido o scaduto");
      setState("idle");
      return;
    }
    setState("done");
  }

  const field =
    "w-full rounded-xl bg-zinc-950 px-3.5 py-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <Brand />
          <Link href="/login" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Accedi
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Nuova password</h1>

        {state === "done" ? (
          <div className="mt-6 rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-4">
            <p className="text-sm font-medium text-emerald-300">Password aggiornata</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
              Le sessioni aperte sugli altri dispositivi sono state disconnesse.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Accedi
            </Link>
          </div>
        ) : token === null ? (
          <p className="mt-6 text-sm text-zinc-500">Caricamento…</p>
        ) : token === "" ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-sm font-medium text-zinc-200">Link non valido</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
              Manca il codice di reset. Richiedi un nuovo link dalla pagina di recupero.
            </p>
            <Link href="/forgot" className="mt-4 inline-block text-xs text-violet-400 hover:underline">
              Richiedi un nuovo link
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Scegli una password di almeno 8 caratteri. Il link funziona una sola volta.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
                  Nuova password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
                  Ripeti la password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={field}
                  required
                  minLength={8}
                />
              </div>

              {error && <p className="text-[12px] text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={state === "busy"}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {state === "busy" ? "…" : "Salva nuova password"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
