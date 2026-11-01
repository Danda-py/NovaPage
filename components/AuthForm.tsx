"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accept, setAccept] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (mode === "register" && !accept) {
      setError("Devi accettare i Termini di servizio per creare un account");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, acceptTerms: accept }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Qualcosa è andato storto");
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const field =
    "w-full rounded-xl bg-zinc-950 px-3.5 py-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="auth-email" className="block text-[11px] uppercase tracking-wider text-zinc-500">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@attivita.it"
          className={field}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="auth-password" className="block text-[11px] uppercase tracking-wider text-zinc-500">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "register" ? "Almeno 8 caratteri" : "La tua password"}
          className={field}
          required
          minLength={mode === "register" ? 8 : undefined}
        />
      </div>

      {mode === "register" && (
        <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-zinc-500">
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-violet-500"
          />
          <span>
            Accetto i{" "}
            <a href="/termini" target="_blank" className="text-violet-400 hover:underline">
              Termini di servizio
            </a>{" "}
            e ho letto l&apos;{" "}
            <a href="/privacy" target="_blank" className="text-violet-400 hover:underline">
              informativa privacy
            </a>
            .
          </span>
        </label>
      )}

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      {mode === "login" && (
        <p className="text-right">
          <a href="/forgot" className="text-[11.5px] text-zinc-500 hover:text-violet-400">
            Password dimenticata?
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {busy ? "…" : mode === "login" ? "Entra" : "Crea account"}
      </button>

      <p className="pt-1 text-center text-[12px] text-zinc-500">
        {mode === "login" ? "Non hai un account?" : "Hai già un account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="font-medium text-violet-400 hover:underline"
        >
          {mode === "login" ? "Registrati" : "Accedi"}
        </button>
      </p>
    </form>
  );
}
