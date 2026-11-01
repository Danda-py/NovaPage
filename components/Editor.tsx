"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Ask, Site } from "@/lib/site";
import type { ChatMessage } from "@/lib/store";
import { SitePreview } from "@/components/SitePreview";
import { FontLoader } from "@/components/FontLoader";
import { AskForm } from "@/components/AskForm";
import { Brand } from "@/components/Brand";
import { ManualEditor } from "@/components/ManualEditor";
import { HtmlEditor } from "@/components/HtmlEditor";
import { PageSettings } from "@/components/PageSettings";
import { ScopedHtml } from "@/components/ScopedHtml";
import { isHtmlPage, sanitizeHtml } from "@/lib/html";

const SUGGESTIONS = [
  "Landing per il mio bar con orari e pulsante WhatsApp",
  "Vetrina sneakers con 4 prodotti e prezzi",
  "Pagina per personal trainer con servizi e contatti",
];

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechWindow = {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function Editor({
  siteId,
  initialSite,
  slug,
  initialMessages,
  restorableMessageIds,
}: {
  siteId: string;
  initialSite: Site;
  slug: string;
  initialMessages: ChatMessage[];
  /** Messaggi con una fotografia della pagina (ultimi cinque turni). */
  restorableMessageIds: string[];
}) {
  const [site, setSite] = useState<Site>(initialSite);
  const [restorable, setRestorable] = useState<string[]>(restorableMessageIds);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Cronologia locale: annulla/ripeti lavorano sulla stessa sequenza di stati che
  // chat ed editor manuale alimentano, senza chiedere al server.
  const historyRef = useRef<Site[]>([initialSite]);
  const cursorRef = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"chat" | "edit" | "html" | "settings" | "preview">("chat");
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const firstRender = useRef(true);
  const saveTimer = useRef<number | null>(null);
  const [supportsVoice, setSupportsVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const w = window as unknown as SpeechWindow;
    setSupportsVoice(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const savingRef = useRef(false);
  const pendingRef = useRef<Site | null>(null);

  /**
   * Una sola PATCH alla volta: due salvataggi che si rincorrono possono arrivare
   * fuori ordine e far vincere sul server la versione più vecchia. Se arriva una
   * modifica mentre si salva, resta in coda e parte appena la precedente chiude.
   */
  const persist = useCallback(
    async (next: Site) => {
      if (savingRef.current) {
        pendingRef.current = next;
        return;
      }
      savingRef.current = true;
      try {
        const res = await fetch(`/api/sites/${siteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: next }),
        });
        setSave(res.ok ? "saved" : "error");
      } catch {
        setSave("error");
      } finally {
        savingRef.current = false;
        const queued = pendingRef.current;
        pendingRef.current = null;
        if (queued) void persist(queued);
      }
    },
    [siteId],
  );

  // Autosalvataggio: chat ed editor manuale scrivono lo stesso JSON, con debounce.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSave("saving");
    saveTimer.current = window.setTimeout(() => void persist(site), 700);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [site, siteId, persist]);

  // Il microfono non deve restare acceso se l'utente chiude l'editor.
  useEffect(() => () => recognition.current?.stop(), []);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");
    for (const file of Array.from(files).slice(0, 3)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) setImages((prev) => [...prev, data.url]);
        // Senza questo, un file troppo grande o non supportato spariva senza spiegazione.
        else setUploadError(typeof data.error === "string" ? data.error : "Caricamento non riuscito.");
      } catch {
        setUploadError("Connessione assente: la foto non è stata caricata.");
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  /** Ogni stato distinto entra in cronologia una volta sola. */
  function applySite(next: Site) {
    setSite(next);
    const current = historyRef.current[cursorRef.current];
    if (current && JSON.stringify(current) === JSON.stringify(next)) return;
    historyRef.current = [...historyRef.current.slice(0, cursorRef.current + 1), next].slice(-40);
    cursorRef.current = historyRef.current.length - 1;
    setCanUndo(cursorRef.current > 0);
    setCanRedo(false);
  }

  function undo() {
    if (cursorRef.current <= 0) return;
    cursorRef.current -= 1;
    setSite(historyRef.current[cursorRef.current]);
    setCanUndo(cursorRef.current > 0);
    setCanRedo(true);
  }

  function redo() {
    if (cursorRef.current >= historyRef.current.length - 1) return;
    cursorRef.current += 1;
    setSite(historyRef.current[cursorRef.current]);
    setCanUndo(true);
    setCanRedo(cursorRef.current < historyRef.current.length - 1);
  }

  async function saveNow() {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await persist(site);
  }

  /** Torna alla pagina com'era subito dopo un messaggio della chat. */
  async function restore(messageId: string) {
    if (restoring) return;
    setRestoring(messageId);
    setNotice("");
    try {
      const res = await fetch(`/api/sites/${siteId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.error ?? "Ripristino non riuscito");
        return;
      }
      if (data.site) applySite(data.site as Site);
      setSave("saved");
      setNotice("Pagina ripristinata a quel messaggio.");
    } catch {
      setNotice("Connessione assente: il ripristino non è partito.");
    } finally {
      setRestoring(null);
    }
  }

  /**
   * La chat legge lo stato dal database: le modifiche manuali ancora in coda
   * devono arrivare prima della richiesta, altrimenti la risposta dell'IA
   * riparte dalla versione vecchia e il salvataggio in coda la sovrascrive.
   */
  async function flushSave() {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      await persist(site);
    }
    for (let i = 0; i < 40 && savingRef.current; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  function toggleVoice() {
    const w = window as unknown as SpeechWindow;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = "it-IT";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (text) setInput((prev) => (prev ? `${prev} ${text}` : text));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognition.current = rec;
    rec.start();
    setListening(true);
  }

  async function send(
    text: string,
    opts: { images?: string[]; answerFor?: string; answers?: Record<string, string> } = {},
  ) {
    const message = text.trim();
    const attachments = opts.images ?? [];
    if ((!message && !attachments.length) || loading) return;

    setInput("");
    setImages([]);
    setLoading(true);
    await flushSave();
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp_${Date.now()}`,
        role: "user",
        text: message || "Ho caricato delle foto.",
        images: attachments,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          message,
          images: attachments,
          answerFor: opts.answerFor,
          answers: opts.answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore");
      if (data.site) applySite(data.site as Site);
      if (Array.isArray(data.messages)) setMessages(data.messages as ChatMessage[]);
      // Il turno appena fatto è ripristinabile subito, senza ricaricare la pagina.
      if (typeof data.restorePoint === "string") {
        setRestorable((prev) => [data.restorePoint, ...prev.filter((x) => x !== data.restorePoint)].slice(0, 5));
      }
      setSave("saved");
    } catch (e) {
      setSave("error");
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: `⚠️ ${e instanceof Error ? e.message : "Qualcosa è andato storto"}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submitAnswers(message: ChatMessage, values: Record<string, string>) {
    const ask = message.ask as Ask | undefined;
    if (!ask) return;
    const lines = ask.fields
      .filter((f) => values[f.key]?.trim())
      .map((f) => `- ${f.label}: ${values[f.key].trim()}`);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, answers: values } : m)));
    send(`Dati forniti:\n${lines.join("\n")}`, { answerFor: message.id, answers: values });
  }

  const chat = (
    <div className="flex h-full min-h-0 flex-col">
      <p className="shrink-0 border-b border-zinc-800 px-4 py-2 text-[10.5px] leading-relaxed text-zinc-500">
        Nova è un&apos;intelligenza artificiale: controlla testi, prezzi e dati prima di pubblicare.
      </p>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[88%]">
              <div className="rounded-2xl bg-violet-600 px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                {m.text}
              </div>
              {!!m.images?.length && (
                <div className="mt-1.5 flex justify-end gap-1.5">
                  {m.images.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div key={m.id} className="max-w-[95%]">
              <div className="rounded-2xl bg-zinc-800/80 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-100">
                {m.text}
              </div>
              {m.ask && (
                <AskForm
                  ask={m.ask}
                  answered={!!m.answers}
                  answers={m.answers}
                  disabled={loading}
                  onSubmit={(values) => submitAnswers(m, values)}
                />
              )}
              {restorable.includes(m.id) && (
                <button
                  type="button"
                  onClick={() => restore(m.id)}
                  disabled={restoring !== null}
                  className="mt-1.5 inline-flex min-h-8 items-center gap-1 rounded-lg border border-zinc-800 px-2 text-[10.5px] text-zinc-400 hover:border-violet-600/60 hover:text-violet-300 disabled:opacity-40"
                >
                  <span aria-hidden>↺</span>
                  {restoring === m.id ? "Ripristino…" : "Ripristina a questo messaggio"}
                </button>
              )}
            </div>
          ),
        )}
        {loading && <div className="text-xs text-zinc-500">Nova sta scrivendo…</div>}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="min-h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:border-violet-600/60 hover:text-zinc-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {uploadError && (
        <p role="alert" className="px-3 pt-1.5 text-[11px] text-red-400">
          {uploadError}
        </p>
      )}

      {notice && (
        <p className="flex items-center justify-between gap-2 px-3 pt-1.5 text-[11px] text-emerald-400">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Chiudi avviso" className="text-zinc-500 hover:text-zinc-300">
            ×
          </button>
        </p>
      )}

      {!!images.length && (
        <div className="flex gap-2 border-t border-zinc-800 px-3 pt-2.5">
          {images.map((src) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <button
                onClick={() => setImages((prev) => prev.filter((x) => x !== src))}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-zinc-300 ring-1 ring-zinc-700"
                aria-label="Rimuovi immagine"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="flex items-center gap-2 border-t border-zinc-800 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input, { images });
        }}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading || loading}
          className="shrink-0 rounded-xl border border-zinc-800 px-2.5 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 disabled:opacity-40"
          aria-label="Allega foto"
          title="Allega foto"
        >
          {uploading ? "…" : "📎"}
        </button>
        {supportsVoice && (
          <button
            type="button"
            onClick={toggleVoice}
            className={`shrink-0 rounded-xl border px-2.5 py-2.5 text-sm ${
              listening
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
            aria-label={listening ? "Ferma dettatura" : "Detta il prompt"}
            title={listening ? "Ferma dettatura" : "Detta il prompt"}
          >
            {listening ? "⏹" : "🎙"}
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Ti ascolto…" : "Scrivi o detta cosa vuoi cambiare…"}
          className="min-w-0 flex-1 rounded-xl bg-zinc-900 px-3.5 py-3 text-sm outline-none ring-1 ring-zinc-800 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={loading || uploading}
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-violet-600 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Invia
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-zinc-800 px-2.5 sm:gap-3 sm:px-4">
        <Brand showName={false} />
        <Link
          href="/dashboard"
          aria-label="Torna ai miei siti"
          className="inline-flex h-9 min-w-8 shrink-0 items-center justify-center gap-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 sm:justify-start"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">I miei siti</span>
        </Link>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{site.meta.title}</span>
        {/* Annulla, ripeti e salva stanno in alto a destra, sempre visibili:
            da telefono il pulsante è anche lo stato del salvataggio. */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Annulla l'ultima modifica"
            title="Annulla"
            className="inline-flex h-9 w-8 items-center justify-center rounded-lg border border-zinc-800 text-[15px] leading-none text-zinc-300 hover:border-zinc-600 disabled:opacity-30"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Ripeti la modifica annullata"
            title="Ripeti"
            className="inline-flex h-9 w-8 items-center justify-center rounded-lg border border-zinc-800 text-[15px] leading-none text-zinc-300 hover:border-zinc-600 disabled:opacity-30"
          >
            ↷
          </button>
          <button
            type="button"
            onClick={saveNow}
            aria-label="Salva la pagina"
            title="Salva"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-2 text-[11px] font-medium text-zinc-200 hover:border-violet-500/70 hover:text-violet-200 sm:px-2.5"
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                save === "error" ? "bg-red-400" : save === "saved" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="px-0.5 text-[10px] sm:px-0 sm:text-[11px]">Salva</span>
          </button>
          <span className="sr-only" aria-live="polite">
            {save === "saving" ? "Salvataggio in corso" : save === "saved" ? "Modifiche salvate" : save === "error" ? "Modifiche non salvate" : ""}
          </span>
        </div>
        <Link
          href={`/sites/${siteId}`}
          aria-label="Statistiche della pagina"
          className="hidden min-h-9 shrink-0 items-center text-xs text-zinc-400 hover:text-zinc-200 sm:inline-flex"
        >
          Statistiche
        </Link>
        <Link
          href={`/s/${slug}`}
          target="_blank"
          className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-zinc-800 px-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 sm:px-2.5"
        >
          Apri
        </Link>
      </header>

      {save === "error" && (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-3 border-b border-red-900/60 bg-red-950/40 px-4 py-2 text-[11.5px] text-red-200"
        >
          <span>Le ultime modifiche non sono state salvate.</span>
          <button
            type="button"
            onClick={() => setSite((current) => ({ ...current }))}
            className="inline-flex min-h-8 items-center rounded-md border border-red-800 px-2.5 font-medium hover:bg-red-900/40"
          >
            Riprova
          </button>
        </div>
      )}

      <div className="flex shrink-0 border-b border-zinc-800 md:hidden">
        {(["chat", "edit", "html", "settings", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-h-11 min-w-0 flex-1 whitespace-nowrap px-0.5 text-[11.5px] font-medium sm:text-[13px] ${
              tab === t ? "text-violet-400" : "text-zinc-500"
            }`}
          >
            {t === "chat"
              ? "Chat"
              : t === "edit"
                ? "Modifica"
                : t === "html"
                  ? "HTML"
                  : t === "settings"
                    ? "Pagina"
                    : "Anteprima"}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`${tab === "preview" ? "hidden" : "flex"} min-h-0 min-w-0 flex-1 flex-col md:flex md:max-w-sm md:border-r md:border-zinc-800`}
        >
          <div className="hidden shrink-0 gap-1 border-b border-zinc-800 p-2 md:flex">
            {(["chat", "edit", "html", "settings"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-medium transition-colors ${
                  tab === t
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t === "chat" ? "Chat" : t === "edit" ? "Modifica" : t === "html" ? "HTML" : "Pagina"}
              </button>
            ))}
          </div>

          <div className={`${tab === "chat" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>{chat}</div>
          <div className={`${tab === "edit" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>
            <ManualEditor
              site={site}
              onChange={applySite}
              openId={selectedBlock}
              onOpenChange={setSelectedBlock}
            />
          </div>
          <div className={`${tab === "html" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>
            <HtmlEditor site={site} onChange={applySite} />
          </div>
          <div className={`${tab === "settings" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>
            <PageSettings site={site} onChange={applySite} />
          </div>
        </div>
        <div className={`${tab === "preview" ? "block" : "hidden"} min-h-0 flex-1 overflow-y-auto md:block`}>
          <div className="mx-auto w-full px-0 py-0 md:max-w-[420px] md:px-6 md:py-8">
            <FontLoader theme={site.theme} />
            <div className="min-h-full overflow-hidden bg-zinc-950 md:rounded-[2.25rem] md:border md:border-zinc-800 md:shadow-2xl">
              {isHtmlPage(site) ? (
                <ScopedHtml html={sanitizeHtml(site.html!)} />
              ) : (
                <SitePreview
                  site={site}
                  selectedBlockId={tab === "edit" ? selectedBlock : null}
                  onSelectBlock={(blockId) => {
                    setSelectedBlock(blockId);
                    setTab("edit");
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
