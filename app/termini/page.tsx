import Link from "next/link";
import { Brand } from "@/components/Brand";

export const metadata = {
  title: "Termini di servizio",
  description:
    "Condizioni d'uso di NovaPage: account, contenuti, usi vietati, contenuti generati dall'IA, proprietà intellettuale e responsabilità.",
};

const sections = [
  {
    title: "1. Oggetto e versione Beta",
    body: [
      "NovaPage è un servizio che crea e modifica landing page attraverso una chat con un modello di intelligenza artificiale. Il servizio è attualmente in versione Beta, a scopo dimostrativo e di test.",
      "Il servizio viene fornito «così com'è» e «come disponibile», senza garanzie di uptime, continuità del servizio, assenza di errori o conservazione dei dati oltre quanto dichiarato nell'informativa privacy. Funzioni possono essere modificate, sospese o rimosse senza preavviso durante la Beta.",
    ],
  },
  {
    title: "2. Account",
    body: [
      "Per usare NovaPage devi creare un account con un indirizzo email valido e una password. Sei responsabile della riservatezza delle tue credenziali e di ogni attività svolta dal tuo account.",
      "Per registrarti devi avere almeno 14 anni, età minima per esprimere autonomamente il consenso ai servizi della società dell'informazione in Italia, oppure 18 anni se la normativa applicabile lo richiede. Se hai meno di 18 anni dichiari di avere il consenso di chi esercita la responsabilità genitoriale.",
      "Le credenziali non vanno condivise: l'account è personale o riferito a una singola attività.",
    ],
  },
  {
    title: "3. Contenuti dell'utente e responsabilità",
    body: [
      "Testi, fotografie, loghi, marchi, prodotti, prezzi e ogni altro materiale che carichi o fai generare restano di tua proprietà. Concedi a NovaPage solo il permesso tecnico di ospitarli e mostrarli per erogare il servizio.",
      "Dichiari di possedere i diritti necessari sui contenuti che pubblichi e di avere il diritto di usare nomi, marchi e immagini che inserisci. Ti assumi ogni responsabilità verso terzi per i contenuti delle tue pagine.",
      "NovaPage non verifica in anticipo i contenuti pubblicati dagli utenti e non ne risponde: in caso di segnalazione può rimuoverli o sospendere la pagina.",
    ],
  },
  {
    title: "4. Usi vietati",
    body: [
      "È vietato usare NovaPage per phishing, truffe, vendita di prodotti o servizi illegali, spam, molestie, disinformazione, contenuti che violano diritti di terzi o norme applicabili, scraping massivo, tentativi di accesso non autorizzati o interferenze con il servizio.",
      "In caso di violazione NovaPage può sospendere o eliminare immediatamente l'account e le pagine coinvolte, anche senza preavviso, e conservare i dati necessari per rispondere alle autorità competenti.",
    ],
  },
  {
    title: "5. Contenuti generati dall'IA",
    body: [
      "Le pagine sono costruite da un sistema di intelligenza artificiale sulla base delle tue istruzioni. L'IA può commettere errori: prima di pubblicare devi verificare testi, prezzi, dati di contatto, informazioni legali e conformità alla normativa applicabile.",
      "Il contenuto pubblicato resta sotto la tua responsabilità editoriale. Quando la chat interagisce con i visitatori della tua pagina, deve essere chiaro che si tratta di un sistema di intelligenza artificiale e non di una persona.",
    ],
  },
  {
    title: "6. Proprietà intellettuale",
    body: [
      "Il codice sorgente, l'architettura dell'editor, il nome, il marchio e la grafica di NovaPage sono di proprietà del titolare del servizio. Ti è concessa una licenza d'uso limitata, non esclusiva e non trasferibile, per usare la piattaforma secondo questi termini.",
      "Non puoi copiare, decompilare, rivendere, sublicenziare o ricostruire la piattaforma né usarla per offrire un servizio concorrente. I contenuti che generi e pubblichi restano tuoi.",
      "Le librerie open source utilizzate sono distribuite con licenze compatibili con l'uso commerciale (MIT, Apache 2.0, ISC) ed elencate nei metadati del progetto.",
    ],
  },
  {
    title: "7. Prezzi, sconti e vetrine",
    body: [
      "Se mostri prezzi, sconti o prodotti devi rispettare la normativa applicabile, inclusa la direttiva Omnibus: quando annunci uno sconto va indicato il prezzo più basso applicato nei 30 giorni precedenti.",
      "Se vendi o promuovi un'attività devi inserire i dati obbligatori (ragione sociale, Partita IVA, sede legale) nei campi dedicati al footer della pagina. NovaPage mette a disposizione i campi, ma non garantisce la conformità delle inserzioni né svolge consulenza fiscale o legale.",
    ],
  },
  {
    title: "8. Limitazione di responsabilità",
    body: [
      "Nei limiti consentiti dalla legge, NovaPage non risponde di danni indiretti, perdita di profitti, perdita di dati, interruzioni del servizio o malfunzionamenti imputabili a fornitori terzi (database, hosting, modelli di intelligenza artificiale, servizi email).",
      "Il servizio non fornisce consulenza legale, fiscale, sanitaria o di marketing: le informazioni generate vanno verificate da un professionista prima dell'uso.",
    ],
  },
  {
    title: "9. Sospensione e cessazione",
    body: [
      "Puoi cancellare il tuo account in qualsiasi momento dalla dashboard: la cancellazione rimuove account, pagine, contatti e conversazioni in modo definitivo.",
      "NovaPage può sospendere un account in caso di violazione di questi termini e può chiudere il servizio Beta con un preavviso ragionevole. Dopo la chiusura i dati possono essere eliminati secondo l'informativa privacy.",
    ],
  },
  {
    title: "10. Modifiche ai termini e legge applicabile",
    body: [
      "Questi termini possono essere aggiornati: la versione vigente è pubblicata su questa pagina con la data di aggiornamento. L'uso del servizio dopo la pubblicazione delle modifiche vale come accettazione.",
      "Si applica la legge italiana. Per le controversie è competente il foro del titolare del servizio, salvo le norme inderogabili a tutela dei consumatori.",
    ],
  },
];

export default function TerminiPage() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Brand />
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Torna al sito
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-400">Termini</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Termini di servizio</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Ultimo aggiornamento: ottobre 2026. Questi termini regolano l&apos;uso di NovaPage. Creando
          un account li accetti.
        </p>

        <p className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-[12.5px] leading-relaxed text-amber-200">
          Modello da far verificare a un consulente legale prima della pubblicazione: ragione
          sociale, sede legale, P.IVA e contatti del titolare vanno completati.
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

        <div className="mt-12 space-y-3 border-t border-zinc-900 pt-6 text-[12.5px] text-zinc-500">
          <p>
            Per domande sui termini:{" "}
            <a href="mailto:legal@novapage.site" className="text-violet-400 hover:underline">
              legal@novapage.site
            </a>
            .
          </p>
          <p className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-zinc-300">
              Informativa privacy
            </Link>
            <Link href="/cookie" className="hover:text-zinc-300">
              Cookie policy
            </Link>
            <Link href="/login" className="hover:text-zinc-300">
              Accedi
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
