"use client";

import { useState } from "react";

type Props = {
  siteId?: string;
  title?: string;
  text?: string;
  accent: string;
  textColor: string;
  soft: string;
  line: string;
  radius: string;
  gradient: string;
  vivid: boolean;
  /** Colore leggibile sopra il riempimento pieno del pulsante. */
  onAccent?: string;
};

export function LeadForm({
  siteId,
  title,
  text,
  accent,
  textColor,
  soft,
  line,
  radius,
  gradient,
  vivid,
  onAccent = "#ffffff",
}: Props) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [consent, setConsent] = useState(false);
  // Il server scarta gli invii arrivati troppo presto: un bot compila e spedisce.
  const [startedAt] = useState(() => Date.now());
  const preview = !siteId;

  const field = {
    width: "100%",
    borderRadius: radius,
    border: `1px solid ${line}`,
    backgroundColor: "transparent",
    color: textColor,
    padding: "0.65rem 0.8rem",
    fontSize: "13px",
    outline: "none",
  } as const;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview || state === "sending") return;
    if (!values.name.trim() && !values.email.trim() && !values.phone.trim()) {
      setError("Inserisci almeno nome, email o telefono");
      return;
    }
    if (!consent) {
      setError("Serve il consenso al trattamento dei dati per inviare il modulo");
      return;
    }
    setError("");
    setState("sending");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, ...values, website: honeypot, consent, startedAt }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Invio non riuscito, riprova");
      setState("idle");
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, label: "Modulo contatti" }),
    });
    setState("done");
  }

  if (state === "done") {
    return (
      <section
        className="border p-5 text-center"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: line, borderRadius: radius }}
      >
        <p className="text-2xl">✓</p>
        <p className="mt-2 text-[13.5px] font-semibold" style={{ color: textColor }}>
          Messaggio inviato
        </p>
        <p className="mt-1 text-[12.5px]" style={{ color: soft }}>
          Grazie, ti ricontatto al più presto.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border p-4"
      style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: line, borderRadius: radius }}
    >
      {title && <h2 className="text-[15px] font-semibold" style={{ color: textColor }}>{title}</h2>}
      {text && (
        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: soft }}>
          {text}
        </p>
      )}

      <div className="mt-3 space-y-2">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ display: "none" }}
        />
        <input
          aria-label="Nome"
          placeholder="Nome"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          readOnly={preview}
          style={field}
        />
        <input
          aria-label="Email"
          type="email"
          placeholder="Email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          readOnly={preview}
          style={field}
        />
        <input
          aria-label="Telefono"
          type="tel"
          placeholder="Telefono"
          value={values.phone}
          onChange={(e) => setValues({ ...values, phone: e.target.value })}
          readOnly={preview}
          style={field}
        />
        <textarea
          aria-label="Messaggio"
          placeholder="Messaggio"
          rows={3}
          value={values.message}
          onChange={(e) => setValues({ ...values, message: e.target.value })}
          readOnly={preview}
          style={{ ...field, resize: "none" }}
        />
      </div>

      <label
        className="mt-3 flex cursor-pointer items-start gap-2.5 py-1 text-[11.5px] leading-relaxed"
        style={{ color: soft }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={preview}
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ accentColor: accent }}
        />
        <span>
          Ho letto l&apos;
          <a
            href="/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
            style={{ color: textColor }}
          >
            informativa privacy
          </a>{" "}
          e acconsento al trattamento dei dati per essere ricontattato.
        </span>
      </label>

      {error && <p className="mt-2 text-[11.5px] text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={preview || state === "sending"}
        className="mt-3 w-full py-3 text-[13px] font-semibold disabled:opacity-60"
        style={{
          borderRadius: radius,
          backgroundImage: vivid ? gradient : undefined,
          backgroundColor: vivid ? undefined : accent,
          color: onAccent,
        }}
      >
        {preview ? "Modulo in anteprima" : state === "sending" ? "Invio…" : "Invia"}
      </button>

      {preview && (
        <p className="mt-2 text-center text-[10.5px] uppercase tracking-[0.16em]" style={{ color: soft }}>
          funziona nella pagina pubblicata
        </p>
      )}
    </form>
  );
}
