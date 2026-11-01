"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/http";

/**
 * Attivazione TOTP senza QR esterno: il segreto si inserisce a mano nell'app di
 * autenticazione. Nessun servizio di terze parti deve vedere la chiave.
 */
export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const input =
    "w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNote("");
    const res = await safeFetch("/api/account/2fa", { method: "POST" });
    if (!res) {
      setError("Connessione assente: riprova.");
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.secret !== "string") {
      setError(typeof data.error === "string" ? data.error : "Attivazione non riuscita");
      setBusy(false);
      return;
    }
    setSetup({ secret: data.secret, otpauth: typeof data.otpauth === "string" ? data.otpauth : "" });
    setBusy(false);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await safeFetch("/api/account/2fa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res) {
      setError("Connessione assente: riprova.");
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Codice non valido");
      setBusy(false);
      return;
    }
    setRecovery(Array.isArray(data.recovery) ? (data.recovery as string[]) : []);
    setSetup(null);
    setCode("");
    setNote("Verifica in due passaggi attiva.");
    setBusy(false);
    router.refresh();
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await safeFetch("/api/account/2fa", {
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
      setError(typeof data.error === "string" ? data.error : "Disattivazione non riuscita");
      setBusy(false);
      return;
    }
    setPassword("");
    setDisabling(false);
    setNote("Verifica in due passaggi disattivata.");
    setBusy(false);
    router.refresh();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copiato.");
    } catch {
      setNote("");
    }
  }

  if (recovery.length) {
    return (
      <div className="space-y-3">
        <p className="text-[12.5px] leading-relaxed text-zinc-300">
          Salva questi codici di recupero: ognuno funziona una sola volta e sostituisce l&apos;app di
          autenticazione se perdi il telefono. Non potrai rivederli da qui.
        </p>
        <ul className="grid grid-cols-2 gap-1.5 rounded-lg bg-zinc-950/70 p-3 font-mono text-[12px] text-zinc-200">
          {recovery.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(recovery.join("\n"))}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] font-medium text-zinc-200 hover:border-zinc-500"
          >
            Copia tutti
          </button>
          <button
            type="button"
            onClick={() => setRecovery([])}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-100 hover:bg-zinc-700"
          >
            Ho salvato i codici
          </button>
        </div>
        {note && <p className="text-[11.5px] text-zinc-400">{note}</p>}
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-[12.5px] text-zinc-300">
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            Attiva
          </span>
          All&apos;accesso ti chiediamo anche il codice a 6 cifre.
        </p>

        {!disabling ? (
          <button
            type="button"
            onClick={() => setDisabling(true)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-zinc-500"
          >
            Disattiva la verifica in due passaggi
          </button>
        ) : (
          <form onSubmit={disable} className="space-y-2 rounded-lg border border-zinc-800 p-3">
            <label htmlFor="twofactor-password" className="block text-[11px] uppercase tracking-wider text-zinc-500">
              Conferma con la password
            </label>
            <input
              id="twofactor-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              required
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy || !password}
                className="rounded-lg bg-red-600/90 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-40"
              >
                {busy ? "…" : "Disattiva"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisabling(false);
                  setPassword("");
                  setError("");
                }}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-300 hover:border-zinc-500"
              >
                Annulla
              </button>
            </div>
          </form>
        )}
        {error && (
          <p role="alert" className="text-[11.5px] text-red-400">
            {error}
          </p>
        )}
        {note && <p className="text-[11.5px] text-zinc-400">{note}</p>}
      </div>
    );
  }

  if (setup) {
    return (
      <form onSubmit={confirm} className="space-y-3">
        <p className="text-[12.5px] leading-relaxed text-zinc-300">
          Apri l&apos;app di autenticazione (Google Authenticator, 1Password, Authy) e aggiungi un
          account con questa chiave, oppure apri il link <code className="text-zinc-200">otpauth</code>.
        </p>
        <div className="space-y-1.5 rounded-lg bg-zinc-950/70 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Chiave</p>
          <p className="break-all font-mono text-[13px] tracking-[0.12em] text-zinc-100">{setup.secret}</p>
          <button
            type="button"
            onClick={() => copy(setup.secret)}
            className="mt-1 rounded border border-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:border-zinc-600"
          >
            Copia chiave
          </button>
          {setup.otpauth && (
            <a
              href={setup.otpauth}
              className="mt-2 block break-all text-[10.5px] text-violet-400 underline-offset-2 hover:underline"
            >
              Apri nell&apos;app di autenticazione
            </a>
          )}
        </div>

        <label htmlFor="twofactor-code" className="block text-[11px] uppercase tracking-wider text-zinc-500">
          Codice a 6 cifre
        </label>
        <input
          id="twofactor-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`${input} text-center font-mono tracking-[0.35em]`}
          required
        />

        {error && (
          <p role="alert" className="text-[11.5px] text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {busy ? "…" : "Verifica e attiva"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSetup(null);
              setCode("");
              setError("");
            }}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-300 hover:border-zinc-500"
          >
            Annulla
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-zinc-400">
        Oltre alla password, chiediamo un codice temporaneo generato sul tuo telefono. È la protezione
        più efficace contro le password rubate.
      </p>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
      >
        {busy ? "…" : "Attiva la verifica in due passaggi"}
      </button>
      {error && (
        <p role="alert" className="text-[11.5px] text-red-400">
          {error}
        </p>
      )}
      {note && <p className="text-[11.5px] text-zinc-400">{note}</p>}
    </div>
  );
}
