"use client";

import { useState } from "react";
import { safeFetch } from "@/lib/http";

export function ChangeEmail({ email }: { email: string }) {
  const [next, setNext] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await safeFetch("/api/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: next, password }),
    });
    if (!res) {
      setError("Connessione assente: riprova.");
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Aggiornamento non riuscito");
      return;
    }
    setDone(typeof data.email === "string" ? data.email : next);
    setNext("");
    setPassword("");
  }

  const field =
    "w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="account-email" className="block text-[11px] uppercase tracking-wider text-zinc-500">
        Nuova email
      </label>
      <input
        id="account-email"
        type="email"
        autoComplete="email"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder={email}
        className={field}
        required
      />
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password attuale"
        className={field}
        required
      />
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      {done && (
        <p className="text-[12px] leading-relaxed text-emerald-400">
          Ti abbiamo inviato un link a {done}. L&apos;email resta quella attuale finché non lo
          confermi.
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {busy ? "…" : "Aggiorna email"}
      </button>
    </form>
  );
}
