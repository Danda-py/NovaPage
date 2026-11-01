"use client";

import { useState } from "react";
import type { Site } from "@/lib/site";
import { MAX_HTML } from "@/lib/html";

const LEGAL_CHECKS: Array<{ title: string; detail: string }> = [
  {
    title: "Chi pubblica risponde del contenuto",
    detail:
      "NovaPage ospita la pagina ma non la controlla né la approva. Testi, immagini, prezzi e promesse sono responsabilità di chi pubblica.",
  },
  {
    title: "Dati del titolare",
    detail:
      "Ragione sociale, P.IVA, sede legale e un contatto: obbligatori per un sito di impresa. Se mancano, chiedili a Nova e finiscono nel footer.",
  },
  {
    title: "Informativa privacy",
    detail:
      "Se la pagina raccoglie dati (moduli, statistiche, cookie) serve un link a un'informativa ex art. 13 GDPR e una base giuridica per il trattamento.",
  },
  {
    title: "Cookie e tracciamenti",
    detail:
      "NovaPage registra visite in forma aggregata senza cookie di profilazione. Se aggiungi Analytics, pixel o video incorporati, serve un banner con consenso preventivo.",
  },
  {
    title: "Prezzi e sconti",
    detail:
      "Con uno sconto vanno indicati il prezzo pieno e il prezzo più basso applicato nei 30 giorni precedenti (direttiva Omnibus).",
  },
  {
    title: "Recensioni e claim",
    detail:
      "Solo giudizi veri e verificabili. Niente \"il migliore\", \"garantito al 100%\", certificazioni o numeri inventati.",
  },
  {
    title: "Immagini, font e marchi",
    detail:
      "Usa solo foto di cui hai i diritti e font con licenza. Loghi di terzi e foto da Google Immagini non sono utilizzabili.",
  },
  {
    title: "Settori regolati",
    detail:
      "Salute, finanza, alcolici, gioco, integratori e simili hanno regole pubblicitarie proprie: verifica le condizioni della tua categoria.",
  },
  {
    title: "Vendite online",
    detail:
      "Se vendi, servono condizioni di vendita, informazioni sul recesso, tempi di consegna e prezzi comprensivi di imposte.",
  },
  {
    title: "Accessibilità",
    detail:
      "Contrasto leggibile, testi alternativi sulle immagini, pagine usabili da tastiera: è buona pratica e sempre più spesso un obbligo.",
  },
];

export function HtmlEditor({
  site,
  onChange,
}: {
  site: Site;
  onChange: (next: Site) => void;
}) {
  const external = site.html ?? "";
  // Stato derivato dalla prop: se la chat riscrive l'HTML, la textarea mostra subito
  // la versione nuova senza un effetto che rimbalza (e senza perdere quanto digitato).
  const [editing, setEditing] = useState({ base: external, draft: external });
  const [open, setOpen] = useState(false);
  const draft = editing.base === external ? editing.draft : external;
  const dirty = draft !== external;
  const update = (value: string) => setEditing({ base: external, draft: value });

  function save() {
    const next = { ...site };
    if (draft.trim()) next.html = draft;
    else delete next.html;
    onChange(next);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 border-b border-zinc-800 px-4 py-3">
        <p className="text-[10.5px] leading-relaxed text-zinc-500">
          HTML e CSS liberi: qualsiasi layout. Gli script vengono rimossi; restano i dati
          strutturati JSON-LD, che Google legge.
        </p>
        <p className="text-[10.5px] leading-relaxed text-zinc-500">
          Per raccogliere contatti basta un modulo con{" "}
          <code className="text-zinc-300">
            {'action="/api/leads/form" method="post" data-novapage-lead'}
          </code>{" "}
          e una casella <code className="text-zinc-300">{'name="consent"'}</code>.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="min-h-8 rounded-lg bg-violet-600 px-3 text-[11.5px] font-medium text-white disabled:opacity-40"
          >
            {dirty ? "Applica HTML" : "Applicato"}
          </button>
          {site.html && (
            <button
              type="button"
              onClick={() => {
                update("");
                const next = { ...site };
                delete next.html;
                onChange(next);
              }}
              className="min-h-8 rounded-lg border border-zinc-700 px-3 text-[11.5px] text-zinc-300 hover:border-zinc-500"
            >
              Torna ai blocchi
            </button>
          )}
          <span className="ml-auto text-[10px] tabular-nums text-zinc-600">
            {draft.length.toLocaleString("it-IT")} / {MAX_HTML.toLocaleString("it-IT")}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <textarea
          value={draft}
          onChange={(e) => update(e.target.value.slice(0, MAX_HTML))}
          spellCheck={false}
          placeholder={'<style>\n  :root { --accento: #8b5cf6; }\n</style>\n\n<section class="hero">\n  <h1>Il nome della tua attività</h1>\n</section>'}
          className="h-64 w-full resize-y rounded-lg bg-zinc-950 p-3 font-mono text-[11.5px] leading-relaxed text-zinc-200 outline-none ring-1 ring-zinc-800 focus:ring-violet-500"
        />

        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-[12px] font-medium text-amber-200">Prima di pubblicare</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-amber-100/70">
            La pagina è tua: nessuno la controlla prima che vada online. Questa lista è quello che
            un&apos;attività deve sistemare per essere in regola.
          </p>
          {site.legalAck?.at && (
            <p className="mt-1 text-[10.5px] text-amber-200/60">
              Responsabilità accettata il {site.legalAck.at.slice(0, 10)} (avviso {site.legalAck.notice}),
              con privacy, cookie e termini generati per questa pagina.
            </p>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-2 text-[11.5px] font-medium text-amber-300 hover:underline"
          >
            {open ? "Nascondi i 10 controlli" : "Mostra i 10 controlli"}
          </button>
          {open && (
            <ul className="mt-3 space-y-2.5">
              {LEGAL_CHECKS.map((item) => (
                <li key={item.title} className="text-[11.5px] leading-relaxed text-amber-100/70">
                  <span className="font-medium text-amber-100">{item.title}. </span>
                  {item.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
