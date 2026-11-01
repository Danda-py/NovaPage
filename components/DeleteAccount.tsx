"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { safeFetch } from "@/lib/http";

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!confirmed) {
      setError("Conferma di voler eliminare l'account");
      return;
    }
    setBusy(true);
    setError("");
    const res = await safeFetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res) {
      setError("Connessione assente: riprova.");
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Cancellazione non riuscita");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const field =
    "w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-red-500";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 shrink-0 items-center self-start rounded-lg border border-zinc-800 px-3 text-[12px] text-zinc-400 transition-colors hover:border-red-900 hover:text-red-400"
      >
        Elimina account
      </button>
    );
  }

  return (
    <form onSubmit={remove} className="rounded-2xl border border-red-900/50 bg-red-950/10 p-4">
      <h2 className="text-sm font-semibold text-red-300">Eliminare l&apos;account?</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
        Verranno cancellati definitivamente tutti i tuoi siti, i contatti ricevuti e le conversazioni
        con la chat. L&apos;operazione non è reversibile.
      </p>

      <div className="mt-3 space-y-2">
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
          Conferma con la password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
          required
          placeholder="La tua password"
        />
        <label className="flex items-start gap-2 text-[12px] leading-relaxed text-zinc-400">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-red-500"
          />
          <span>Sì, voglio eliminare definitivamente il mio account.</span>
        </label>
      </div>

      {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !confirmed}
          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40"
        >
          {busy ? "…" : "Elimina account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
            setPassword("");
            setConfirmed(false);
          }}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
