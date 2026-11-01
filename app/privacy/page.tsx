import Link from "next/link";
import { Brand } from "@/components/Brand";
import { jsonLdScript, webPageJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Informativa privacy",
  description: "Quali dati raccoglie NovaPage, perché, per quanto tempo e come esercitare i tuoi diritti.",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    title: "Titolare del trattamento",
    body: [
      "NovaPage è il titolare del trattamento dei dati raccolti tramite questa applicazione. Per qualsiasi richiesta relativa ai dati personali puoi scrivere a privacy@novapage.site.",
    ],
  },
  {
    title: "Dati trattati",
    body: [
      "Account: indirizzo email e password. La password non viene mai salvata in chiaro: conserviamo solo un hash scrypt con salt diverso per ogni utente.",
      "Contenuti delle landing page: testi, immagini, colori e impostazioni che inserisci nella chat o carichi tramite l'editor.",
      "Contatti ricevuti dai moduli: nome, email, telefono e messaggio lasciati dai visitatori delle tue pagine, insieme alla data e al momento in cui hanno prestato il consenso.",
      "Statistiche: visite e clic sulle pagine pubblicate. Per contare i visitatori unici l'indirizzo IP viene trasformato in un'impronta hash salata che cambia ogni giorno: non viene conservato l'IP e non è possibile risalire alla persona.",
      "Dati tecnici: log degli errori applicativi, senza contenuto dei messaggi scambiati in chat.",
    ],
  },
  {
    title: "Finalità e base giuridica",
    body: [
      "I dati dell'account sono trattati per eseguire il contratto di utilizzo del servizio (art. 6.1.b GDPR): senza email e password non è possibile accedere ai tuoi siti.",
      "I contatti raccolti dai moduli delle tue pagine sono trattati in base al consenso dell'interessato (art. 6.1.a GDPR), espresso con la casella presente nel modulo.",
      "Le statistiche aggregate e i log tecnici rispondono al legittimo interesse a mantenere il servizio funzionante e sicuro (art. 6.1.f GDPR).",
    ],
  },
  {
    title: "Destinatari",
    body: [
      "I dati sono ospitati presso fornitori che agiscono come responsabili del trattamento: Neon (database Postgres), Vercel (hosting e distribuzione), Resend (invio delle email transazionali come il reset della password).",
      "Non vendiamo dati personali e non li comunichiamo a terzi per finalità di marketing.",
    ],
  },
  {
    title: "Conservazione",
    body: [
      "I dati dell'account e i contenuti delle landing restano finché l'account esiste.",
      "I contatti ricevuti dai moduli restano finché il titolare della pagina non li elimina o non cancella l'account.",
      "I link di reset password scadono dopo un'ora e possono essere usati una sola volta.",
      "I log degli errori vengono conservati per il tempo necessario alla diagnosi e comunque non oltre novanta giorni.",
    ],
  },
  {
    title: "I tuoi diritti",
    body: [
      "Puoi chiedere accesso, rettifica, cancellazione, limitazione e portabilità dei dati, oltre a opporti al trattamento fondato sul legittimo interesse (artt. 15-22 GDPR).",
      "La cancellazione completa è disponibile nelle impostazioni account, alla voce «Elimina account»: rimuove account, siti, contatti e conversazioni in modo definitivo.",
      "Se ritieni che il trattamento violi la normativa puoi proporre reclamo al Garante per la protezione dei dati personali.",
    ],
  },
  {
    title: "Cookie",
    body: [
      "NovaPage usa un solo cookie tecnico, necessario a mantenere la sessione di accesso: è HttpOnly, non contiene dati personali, non viene usato per profilazione e non richiede consenso.",
      "Non usiamo Google Analytics né altri strumenti di tracciamento di terze parti. Nelle pagine pubblicate salviamo solo un segnalibro di sessione nel browser (sessionStorage) che evita di contare due volte la stessa visita nella stessa scheda: si cancella alla chiusura e non identifica la persona. Le visite uniche sono contate lato server con un'impronta hash giornaliera del solo indirizzo IP, che non viene conservato.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            webPageJsonLd({
              title: "Informativa privacy",
              description: "Quali dati raccoglie NovaPage, perché, per quanto tempo e come esercitare i tuoi diritti.",
              path: "/privacy",
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
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-400">Informativa</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Privacy e trattamento dei dati</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Ultimo aggiornamento: ottobre 2026. Questa pagina descrive in modo concreto quali dati
          raccoglie NovaPage e come vengono usati.
        </p>

        <p className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-[12.5px] leading-relaxed text-amber-200">
          Modello informativo da far verificare a un consulente privacy prima della pubblicazione:
          ragione sociale, sede legale e contatti del titolare vanno completati con i dati reali.
        </p>

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

        <div className="mt-12 border-t border-zinc-900 pt-6 text-[12.5px] leading-relaxed text-zinc-500">
          Per esercitare i diritti o chiedere chiarimenti:{" "}
          <a href="mailto:privacy@novapage.site" className="text-violet-400 hover:underline">
            privacy@novapage.site
          </a>
          .
          <div className="legal-links mt-3 flex flex-wrap gap-4 text-[12px]">
            <Link href="/termini" className="hover:text-zinc-300">Termini di servizio</Link>
            <Link href="/cookie" className="hover:text-zinc-300">Cookie policy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
