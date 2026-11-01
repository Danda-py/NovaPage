"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LeadActions({
  siteId,
  leadId,
  email,
  handled,
  repliedAt,
  notes,
  siteTitle,
}: {
  siteId: string;
  leadId: string;
  email: string;
  handled: boolean;
  repliedAt: string | null;
  notes: string;
  siteTitle: string;
}) {
  const router = useRouter();
  const [isHandled, setIsHandled] = useState(handled);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(`Re: la tua richiesta — ${siteTitle}`);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  const [sentAt, setSentAt] = useState(repliedAt);
  const [note, setNote] = useState(notes);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const field =
    "w-full rounded-lg bg-zinc-950 px-3 py-2 text-[13px] outline-none ring-1 ring-zinc-800 focus:ring-violet-500";

  async function patch(payload: Record<string, unknown>) {
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, leadId, ...payload }),
      });
      return res.ok;
    } catch {
      // Rete assente: senza questo la promise resta appesa e il bottone "…" per sempre.
      return false;
    }
  }

  async function toggleHandled() {
    if (busy) return;
    setBusy(true);
    const target = !isHandled;
    if (await patch({ handled: target })) {
      setIsHandled(target);
      setError("");
      router.refresh();
    } else {
      setError("Aggiornamento non riuscito: riprova.");
    }
    setBusy(false);
  }

  async function saveNote() {
    if (savingNote) return;
    setSavingNote(true);
    const ok = await patch({ notes: note });
    setSavingNote(false);
    setNoteSaved(ok);
    setError(ok ? "" : "Nota non salvata: riprova.");
    if (ok) router.refresh();
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/leads/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, leadId, subject, text }),
    }).catch(() => null);
    if (!res) {
      setSending(false);
      setError("Connessione assente: la risposta non è partita.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "Invio non riuscito");
      setFallback(Boolean(data.fallback));
      return;
    }
    setSentAt(data.lead?.repliedAt ?? new Date().toISOString());
    setIsHandled(true);
    setText("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2 border-t border-zinc-800/80 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleHandled}
          disabled={busy}
          className={`inline-flex min-h-9 items-center rounded-lg border px-2.5 text-[11px] font-medium disabled:opacity-50 ${
            isHandled
              ? "border-emerald-700/60 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          {busy ? "…" : isHandled ? "Gestito ✓" : "Segna gestito"}
        </button>

        {email && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex min-h-9 items-center rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 text-[11px] font-medium text-violet-300 hover:bg-violet-500/20"
          >
            {open ? "Chiudi" : "Rispondi"}
          </button>
        )}

        {sentAt && (
          <span className="text-[11px] text-emerald-400">
            Risposta inviata il{" "}
            {new Date(sentAt).toLocaleDateString("it-IT", { dateStyle: "short" })}
          </span>
        )}
      </div>

      {open && (
        <form onSubmit={sendReply} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={field}
            aria-label="Oggetto"
            maxLength={140}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Ciao ${"…"}, grazie per averci scritto…`}
            rows={5}
            maxLength={5000}
            className={`${field} resize-y leading-relaxed`}
            aria-label="Testo della risposta"
            required
          />
          <p className="text-[10.5px] leading-relaxed text-zinc-500">
            La risposta parte dall&apos;indirizzo della pagina e va all&apos;email del contatto. Le
            repliche tornano a te.
          </p>
          {error && <p className="text-[11.5px] text-red-400">{error}</p>}
          {fallback && (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}
              className="inline-flex min-h-9 items-center text-[11.5px] text-violet-300 hover:underline"
            >
              Apri nel tuo client email
            </a>
          )}
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="inline-flex min-h-9 items-center rounded-lg bg-violet-600 px-3 text-[11.5px] font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {sending ? "Invio…" : "Invia risposta"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="block text-[10.5px] uppercase tracking-wider text-zinc-600">
            Nota privata
          </span>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteSaved(false);
            }}
            rows={1}
            maxLength={2000}
            placeholder="Es. richiamare lunedì"
            className={`${field} mt-1 resize-y`}
          />
        </label>
        <button
          type="button"
          onClick={saveNote}
          disabled={savingNote || note === notes}
          className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 px-2.5 text-[11px] text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
        >
          {savingNote ? "…" : noteSaved ? "Salvata ✓" : "Salva nota"}
        </button>
      </div>
    </div>
  );
}
