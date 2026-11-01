"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Ask, Site } from "@/lib/site";
import type { ChatMessage } from "@/lib/store";
import { SitePreview } from "@/components/SitePreview";
import { AskForm } from "@/components/AskForm";
import { Brand } from "@/components/Brand";
import { ManualEditor } from "@/components/ManualEditor";
import { HtmlEditor } from "@/components/HtmlEditor";
import { PageSettings } from "@/components/PageSettings";
import { CustomPage } from "@/components/CustomPage";
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
}: {
  siteId: string;
  initialSite: Site;
  slug: string;
  initialMessages: ChatMessage[];
}) {
  const [site, setSite] = useState<Site>(initialSite);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
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

  // Autosalvataggio: chat ed editor manuale scrivono lo stesso JSON, con debounce.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSave("saving");
    saveTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: site }),
        });
        setSave(res.ok ? "saved" : "error");
      } catch {
        setSave("error");
      }
    }, 700);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [site, siteId]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files).slice(0, 3)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.url) setImages((prev) => [...prev, data.url]);
      } catch {
        // ignora il singolo file fallito
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
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
      if (data.site) setSite(data.site as Site);
      if (Array.isArray(data.messages)) setMessages(data.messages as ChatMessage[]);
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
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 px-3 sm:gap-3 sm:px-4">
        <Brand showName={false} />
        <Link
          href="/dashboard"
          aria-label="Torna ai miei siti"
          className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">I miei siti</span>
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{site.meta.title}</span>
        {/* Lo stato del salvataggio serve anche da telefono: prima era nascosto
            sotto la soglia sm, quindi non si sapeva se le modifiche erano salvate. */}
        {save !== "idle" && (
          <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] text-zinc-500" aria-live="polite">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                save === "error" ? "bg-red-400" : save === "saved" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {save === "saving" ? "Salvo…" : save === "saved" ? "Salvato" : "Non salvato"}
          </span>
        )}
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
          className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-zinc-800 px-2.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
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

      <div className="flex border-b border-zinc-800 md:hidden">
        {(["chat", "edit", "html", "settings", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-h-11 flex-1 text-[13px] font-medium ${tab === t ? "text-violet-400" : "text-zinc-500"}`}
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
              onChange={setSite}
              openId={selectedBlock}
              onOpenChange={setSelectedBlock}
            />
          </div>
          <div className={`${tab === "html" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>
            <HtmlEditor site={site} onChange={setSite} />
          </div>
          <div className={`${tab === "settings" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>
            <PageSettings site={site} onChange={setSite} />
          </div>
        </div>
        <div className={`${tab === "preview" ? "block" : "hidden"} min-h-0 flex-1 overflow-y-auto md:block`}>
          <div className="mx-auto w-full px-0 py-0 md:max-w-[420px] md:px-6 md:py-8">
            <div className="min-h-full overflow-hidden bg-zinc-950 md:rounded-[2.25rem] md:border md:border-zinc-800 md:shadow-2xl">
              {isHtmlPage(site) ? (
                <CustomPage html={sanitizeHtml(site.html!)} siteId={siteId} trackViews={false} />
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
