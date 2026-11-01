import type { Site } from "./site";

export type LegalDoc = "privacy" | "cookie" | "termini";

export const LEGAL_DOCS: LegalDoc[] = ["privacy", "cookie", "termini"];

export function isLegalDoc(value: string): value is LegalDoc {
  return (LEGAL_DOCS as string[]).includes(value);
}

export type LegalSection = { heading: string; body: string[] };
export type LegalContent = { title: string; intro: string; sections: LegalSection[] };

/**
 * Testi legali generati dai dati reali della pagina.
 *
 * Sono un punto di partenza serio, non una consulenza legale: dichiarano chi è
 * il titolare, cosa raccoglie la pagina e quali diritti spettano al visitatore,
 * così ogni landing pubblicata ha le informazioni minime richieste. Chi pubblica
 * resta responsabile di verificarle e completarle.
 */
export function legalDocContent(
  doc: LegalDoc,
  site: Site,
  input: {
    slug: string;
    updatedAt: string;
    contactEmail?: string;
    services?: { email?: boolean };
  },
): LegalContent {
  const owner = site.legal?.businessName?.trim() || site.meta.title;
  const vat = site.legal?.vat?.trim();
  const address = site.legal?.address?.trim();
  const email = input.contactEmail?.trim();
  const updated = new Date(input.updatedAt).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const identity = [
    `Titolare del trattamento: ${owner}${vat ? `, P.IVA ${vat}` : ""}${address ? `, ${address}` : ""}.`,
    email
      ? `Per qualsiasi richiesta: ${email}.`
      : "Per qualsiasi richiesta usa i recapiti pubblicati nella pagina.",
  ];

  if (doc === "privacy") {
    return {
      title: "Informativa privacy",
      intro: `Questa pagina descrive come ${owner} tratta i dati personali di chi visita e usa questo sito.`,
      sections: [
        { heading: "Titolare del trattamento", body: identity },
        {
          heading: "Quali dati raccogliamo",
          body: [
            "Dati che ci fornisci volontariamente: nome, email, telefono e messaggio quando compili un modulo di contatto o scrivi per informazioni.",
            "Dati tecnici di navigazione: pagina visitata, data e ora, tipo di dispositivo. Sono raccolti in forma aggregata e non permettono di identificarti.",
          ],
        },
        {
          heading: "Perché li trattiamo",
          body: [
            "Per rispondere alla tua richiesta e gestire il rapporto con te (art. 6.1.b GDPR).",
            "Per misurare in forma anonima l'andamento della pagina e migliorarla (legittimo interesse, art. 6.1.f GDPR).",
            "Per adempiere a obblighi di legge, quando previsti.",
          ],
        },
        {
          heading: "Per quanto tempo",
          body: [
            "Le richieste di contatto sono conservate fino a 24 mesi dall'ultimo scambio, salvo obblighi di legge più lunghi.",
            "I dati statistici aggregati sono conservati fino a 12 mesi.",
          ],
        },
        {
          heading: "Chi li vede",
          body: [
            "I dati non sono venduti né ceduti a terzi per finalità di marketing.",
            "Sono trattati da fornitori tecnici che ospitano il sito e il database, nominati responsabili del trattamento ai sensi dell'art. 28 GDPR.",
          ],
        },
        {
          heading: "Fornitori tecnici",
          body: [
            "Hosting e distribuzione del sito: fornitore di cloud con server nell'Unione Europea e trasferimenti extra-UE coperti da clausole contrattuali standard.",
            "Database: servizio gestito con cifratura in transito e accesso limitato alle credenziali del titolare.",
            ...(input.services?.email
              ? ["Email transazionali (conferme e notifiche dei moduli): fornitore specializzato nell'invio di email."]
              : []),
          ],
        },
        {
          heading: "I tuoi diritti",
          body: [
            "Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opposizione al trattamento (art. 15-22 GDPR) scrivendo ai recapiti indicati sopra.",
            "Se ritieni che il trattamento violi la normativa puoi proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
          ],
        },
      ],
    };
  }

  if (doc === "cookie") {
    return {
      title: "Cookie e tracciamenti",
      intro: `Cosa memorizza questo sito quando lo visiti: ${owner} non usa cookie di profilazione.`,
      sections: [
        { heading: "Nessun cookie pubblicitario", body: ["Questa pagina non installa cookie per profilare gli utenti e non condivide dati con piattaforme pubblicitarie."] },
        {
          heading: "Cosa viene memorizzato",
          body: [
            "Un'etichetta tecnica nella memoria di sessione del browser (sessionStorage) che evita di contare due volte la stessa visita. Si cancella chiudendo la scheda.",
            "Il conteggio delle visite è aggregato e non riconduce a una persona.",
          ],
        },
        {
          heading: "Cookie di sessione dell'area riservata",
          body: [
            "Solo se accedi all'area di gestione viene impostato un cookie tecnico di sessione (`np_session`), necessario all'autenticazione e non usato per profilazione.",
          ],
        },
        {
          heading: "Come eliminarli",
          body: [
            "Puoi cancellare cookie e dati di sessione dalle impostazioni del browser, in qualsiasi momento, senza conseguenze sulla lettura del sito.",
          ],
        },
        {
          heading: "Servizi di terze parti",
          body: [
            "Se la pagina incorpora video, mappe o altri servizi esterni, questi possono impostare propri cookie: in quel caso serve un consenso preventivo e il titolare della pagina deve attivare un banner.",
            `Per dubbi scrivi a ${email ?? "i recapiti indicati nella pagina"}.`,
          ],
        },
      ],
    };
  }

  return {
    title: "Termini d'uso",
    intro: `Condizioni d'uso della pagina pubblicata da ${owner} con NovaPage.`,
    sections: [
      { heading: "Oggetto", body: [`Queste condizioni regolano la consultazione della pagina /s/${input.slug} e dei suoi contenuti.`] },
      {
        heading: "Contenuti e responsabilità",
        body: [
          `Testi, immagini, prezzi, promozioni e informazioni pubblicate sono forniti e controllati da ${owner}, che ne risponde in via esclusiva.`,
          "NovaPage fornisce lo strumento tecnico di pubblicazione e non verifica, approva o garantisce i contenuti delle pagine dei propri utenti.",
        ],
      },
      {
        heading: "Informazioni pubblicate",
        body: [
          "Prezzi, disponibilità e orari possono cambiare senza preavviso: fanno fede le condizioni comunicate direttamente dal titolare.",
          "Nessuna informazione della pagina costituisce offerta contrattuale, salvo indicazione esplicita.",
        ],
      },
      {
        heading: "Uso consentito",
        body: [
          "È vietato usare la pagina per attività illecite, per diffondere contenuti offensivi o per tentare di comprometterne la sicurezza.",
        ],
      },
      {
        heading: "Legge applicabile",
        body: [
          "Si applica la legge italiana. Per i consumatori resta competente il foro del luogo di residenza o domicilio, come previsto dal Codice del consumo.",
        ],
      },
      { heading: "Aggiornamenti", body: [`Ultimo aggiornamento: ${updated}.`] },
    ],
  };
}
