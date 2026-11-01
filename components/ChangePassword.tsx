"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChangePassword() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function reset() {
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
    setDone(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (next.length < 8) {
      setError("La nuova password deve avere almeno 8 caratteri");
      return;
    }
    if (next !== confirm) {
      setError("Le due password non coincidono");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Cambio password non riuscito");
      return;
    }
    setDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    router.refresh();
  }

  const field =
    "w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center self-start rounded-lg border border-zinc-800 px-3 text-[12px] text-zinc-400 transition-colors hover:border-violet-700 hover:text-violet-300"
      >
        Cambia password
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="text-sm font-semibold">Cambia password</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
        Le sessioni aperte sugli altri dispositivi verranno disconnesse.
      </p>

      <div className="mt-3 space-y-2">
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={field}
          placeholder="Password attuale"
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={field}
          placeholder="Nuova password (almeno 8 caratteri)"
          required
          minLength={8}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={field}
          placeholder="Ripeti la nuova password"
          required
          minLength={8}
        />
      </div>

      {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
      {done && <p className="mt-2 text-[12px] text-emerald-400">Password aggiornata.</p>}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? "…" : "Salva nuova password"}
        </button>
        <button type="button" onClick={reset} className="text-xs text-zinc-400 hover:text-zinc-200">
          Chiudi
        </button>
      </div>
    </form>
  );
}
