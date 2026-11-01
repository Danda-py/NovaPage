import Link from "next/link";
import { Brand } from "@/components/Brand";
import { jsonLdScript, webPageJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Cookie policy",
  description:
    "Quali cookie usa NovaPage, a cosa serve il cookie di sessione e perché non serve un banner di consenso.",
  alternates: { canonical: "/cookie" },
};

const rows = [
  {
    name: "np_session",
    purpose: "Mantiene la sessione di accesso al tuo account.",
    duration: "30 giorni",
    type: "Tecnico, necessario",
  },
  {
    name: "np_view_* (sessionStorage)",
    purpose:
      "Evita di contare due volte la stessa visita nella stessa scheda del browser. Non identifica la persona e si cancella alla chiusura della scheda.",
    duration: "Sessione del browser",
    type: "Tecnico, necessario alla misurazione aggregata",
  },
];

const sections = [
  {
    title: "Cosa sono i cookie",
    body: [
      "I cookie sono piccoli file di testo che un sito salva nel browser per ricordare informazioni tra una richiesta e l'altra. Esistono anche altre forme di memoria locale del browser, come sessionStorage e localStorage, soggette alle stesse regole.",
      "I cookie tecnici, necessari a far funzionare il servizio, non richiedono consenso. I cookie di profilazione o di tracciamento di terze parti sì: NovaPage non ne usa.",
    ],
  },
  {
    title: "Cookie usati da NovaPage",
    body: [
      "NovaPage usa un solo cookie: np_session. È HttpOnly, SameSite=Lax, Secure quando il sito è in produzione e dura 30 giorni. Serve esclusivamente a riconoscere l'utente autenticato e senza di esso non sarebbe possibile accedere alla dashboard o all'editor. Non contiene dati personali e non viene usato per profilazione o pubblicità.",
      "Nelle pagine pubbliche delle landing viene usato sessionStorage per non registrare due volte la stessa visita nella stessa scheda: è un dato tecnico, cancellato alla chiusura della scheda, e non permette di riconoscere il visitatore.",
    ],
  },
  {
    title: "Nessun tracciamento di terze parti",
    body: [
      "Non usiamo Google Analytics, PostHog, pixel pubblicitari o altri strumenti di tracciamento di terze parti.",
      "Non salviamo identificativi permanenti nel browser dei visitatori delle pagine pubblicate. Le visite uniche sono contate lato server con un'impronta hash salata dell'indirizzo IP che cambia ogni giorno: l'IP non viene conservato e non è possibile risalire alla persona.",
    ],
  },
  {
    title: "Perché non c'è un banner",
    body: [
      "Il banner di consenso serve quando il sito installa cookie o memoria locale non necessari, come analytics di terze parti o pubblicità. NovaPage usa solo strumenti tecnici necessari: per questo non compare un banner.",
      "Se in futuro introdurremo strumenti di misurazione o marketing che richiedono consenso, aggiorneremo questa pagina e aggiungeremo il banner prima di attivarli.",
    ],
  },
  {
    title: "Come gestire i cookie",
    body: [
      "Puoi cancellare o bloccare i cookie dalle impostazioni del tuo browser. Bloccare np_session impedisce l'accesso all'account, perché la sessione non può essere mantenuta.",
      "Le istruzioni sono nelle impostazioni di Chrome, Safari, Firefox ed Edge, alla voce privacy e cookie.",
    ],
  },
  {
    title: "Riferimenti",
    body: [
      "Per il trattamento dei dati personali consulta l'informativa privacy. Per le condizioni d'uso del servizio consulta i termini di servizio.",
    ],
  },
];

export default function CookiePage() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            webPageJsonLd({
              title: "Cookie policy",
              description:
                "Quali cookie usa NovaPage, a cosa serve il cookie di sessione e perché non serve un banner di consenso.",
              path: "/cookie",
              baseUrl: siteUrl(),
            }),
          ),
        }}
      />
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Brand />
          <Link href="/" className="inline-flex min-h-9 items-center text-xs text-zinc-400 hover:text-zinc-200">
            ← Torna al sito
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-400">Cookie</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Cookie policy</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Ultimo aggiornamento: ottobre 2026. Cosa salva NovaPage nel tuo browser e perché.
        </p>

        <p className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-[12.5px] leading-relaxed text-amber-200">
          Modello da far verificare a un consulente legale prima della pubblicazione: ragione
          sociale, sede legale, P.IVA e contatti del titolare vanno completati.
        </p>

        <div className="mt-10 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Cosa salviamo</p>
          {rows.map((row) => (
            <div
              key={row.name}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-[12px] text-zinc-200">{row.name}</span>
                <span className="text-[10.5px] uppercase tracking-wider text-zinc-500">
                  {row.type}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{row.purpose}</p>
              <p className="mt-1.5 text-[11.5px] text-zinc-500">Durata: {row.duration}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold tracking-tight">{section.title}</h2>
              <div className="mt-2 space-y-2">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-[13.5px] leading-relaxed text-zinc-400">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-zinc-900 pt-6 text-[12.5px] text-zinc-500">
          <Link href="/privacy" className="hover:text-zinc-300">
            Informativa privacy
          </Link>
          <Link href="/termini" className="hover:text-zinc-300">
            Termini di servizio
          </Link>
          <a href="mailto:privacy@novapage.site" className="hover:text-zinc-300">
            privacy@novapage.site
          </a>
        </div>
      </main>
    </div>
  );
}
