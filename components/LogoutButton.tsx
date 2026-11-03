"use client";

import { useState } from "react";
import { safeFetch } from "@/lib/http";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await safeFetch("/api/auth/logout", { method: "POST" });
    if (!res?.ok) {
      setError(res ? "Uscita non riuscita" : "Connessione assente");
      setBusy(false);
      return;
    }
    // Un caricamento completo azzera ogni stato client e applica subito il cookie
    // cancellato: con replace+refresh la dashboard poteva restare visibile.
    window.location.replace("/login");
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className="inline-flex min-h-9 items-center rounded-lg border border-zinc-800 px-3 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-50"
      >
        {busy ? "…" : "Esci"}
      </button>
      {error && (
        <span role="alert" className="mt-0.5 text-[10px] text-red-400">
          {error}
        </span>
      )}
    </span>
  );
}
