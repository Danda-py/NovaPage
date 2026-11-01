import { NextResponse } from "next/server";
import { applyToolCalls, normalizeAsk } from "@/lib/site";
import type { Ask, Site, ToolCall } from "@/lib/site";
import { appendChat, getChat, getSite, logError, setChatAnswers, updateSite } from "@/lib/store";
import { buildConversationContext } from "@/lib/context";
import { claimsChange, NO_CHANGE_REPLY } from "@/lib/chat-guards";
import { colorDirective } from "@/lib/colors";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Direzioni creative: ne viene scelta una a caso per ogni nuova pagina, così due siti non si somigliano.
const DESIGN_DIRECTIONS = [
  { style: "aurora", font: "sans", bg: "#08070f", text: "#f3f0ff", accent: "#8b5cf6", accent2: "#22d3ee", tone: "notturno, elegante, calmo" },
  { style: "neon", font: "sans", bg: "#0a0705", text: "#fff7ed", accent: "#f97316", accent2: "#ef4444", tone: "energico, streetwear, ad alta voce" },
  { style: "editorial", font: "serif", bg: "#f7f5f0", text: "#16130f", accent: "#b45309", accent2: "#6b7280", tone: "rivista, artigianale, calmo" },
  { style: "luxury", font: "serif", bg: "#0d0b08", text: "#f5efe3", accent: "#d4af37", accent2: "#8a6d1f", tone: "raffinato, esclusivo, lento" },
  { style: "glass", font: "sans", bg: "#06110f", text: "#e7fff6", accent: "#10b981", accent2: "#38bdf8", tone: "fresco, naturale, moderno" },
  { style: "neon", font: "sans", bg: "#12060f", text: "#fff1f7", accent: "#ec4899", accent2: "#8b5cf6", tone: "giovane, social, giocoso" },
  { style: "aurora", font: "sans", bg: "#050a18", text: "#eaf1ff", accent: "#3b82f6", accent2: "#22d3ee", tone: "affidabile, pulito, professionale" },
  { style: "editorial", font: "sans", bg: "#faf8f5", text: "#1c1917", accent: "#0f766e", accent2: "#a8a29e", tone: "essenziale, luminoso, ordinato" },
  { style: "minimal", font: "sans", bg: "#0b0b0d", text: "#f2f2f2", accent: "#e11d48", accent2: "#a3a3a3", tone: "diretto, industriale, senza fronzoli" },
  { style: "glass", font: "sans", bg: "#0e0b16", text: "#f4f0ff", accent: "#a78bfa", accent2: "#f0abfc", tone: "delicato, curato, beauty" },
] as const;

// Schema esplicito dei contenuti di un blocco: senza le proprietà, Gemini omette i dati.
const BLOCK_DATA_SCHEMA = {
  type: "OBJECT",
  description: "Contenuti del blocco. Compila solo i campi pertinenti al tipo di blocco.",
  properties: {
    layout: {
      type: "STRING",
      enum: ["grid", "carousel", "list"],
      description:
        "Disposizione di catalog o gallery: carousel = scorrimento orizzontale, list = righe, grid = griglia",
    },
    title: { type: "STRING", description: "Titolo (hero, catalog, hours, gallery, contact)" },
    subtitle: { type: "STRING", description: "Sottotitolo o frase di presentazione (hero, max 140 caratteri)" },
    badge: { type: "STRING", description: "Etichetta breve sopra il titolo (hero), es. 'Aperto ora'" },
    avatar: { type: "STRING", description: "URL https completo della foto profilo (hero)" },
    text: { type: "STRING", description: "Testo del banner o descrizione contatti" },
    phone: { type: "STRING", description: "Numero di telefono leggibile (contact)" },
    email: { type: "STRING", description: "Indirizzo email (contact)" },
    whatsapp: { type: "STRING", description: "Numero WhatsApp con prefisso internazionale, es. 393331234567" },
    address: { type: "STRING", description: "Indirizzo fisico, es. Via Roma 1, Milano (contact)" },
    buttons: {
      type: "ARRAY",
      description: "Pulsanti link (links)",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING", description: "Testo breve del pulsante" },
          url: { type: "STRING", description: "URL https completo, oppure stringa vuota se non noto" },
          icon: {
            type: "STRING",
            enum: ["pdf", "pin", "whatsapp", "instagram", "tiktok", "phone", "email", "globe", "calendar", "shop", "none"],
            description: "Icona coerente con il link",
          },            variant: {
              type: "STRING",
              enum: ["primary", "ghost"],
              description: "primary per l'azione principale, ghost per le secondarie",
            },
            color: {
              type: "STRING",
              description:
                "Solo se l'utente chiede un colore specifico per questo pulsante: esadecimale #RRGGBB. Altrimenti ometti.",
            },
        },
        required: ["label", "url"],
      },
    },
    items: {
      type: "ARRAY",
      description: "Prodotti o voci di menu (catalog)",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          price: { type: "STRING", description: "Prezzo con valuta, es. 12€" },
          description: {
            type: "STRING",
            description:
              "Solo se l'utente fornisce dettagli: descrizione breve del prodotto o del piatto, max 300 caratteri. Non inventare.",
          },
          image: { type: "STRING", description: "URL https dell'immagine, oppure vuoto" },
          status: { type: "STRING", description: "Es. Disponibile, Sold Out" },
          compareAtPrice: {
            type: "STRING",
            description:
              "Solo se il prezzo è scontato: prezzo pieno barrato, es. 39€.",
          },
          lowestPrice30: {
            type: "STRING",
            description:
              "Solo se il prezzo è scontato: prezzo più basso applicato nei 30 giorni precedenti lo sconto (direttiva Omnibus), es. 29€.",
          },
        },
        required: ["name", "price"],
      },
    },
    hours: {
      type: "ARRAY",
      description: "Righe degli orari (hours)",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "STRING", description: "Es. Lun - Ven" },
          time: { type: "STRING", description: "Es. 09:00 - 19:00, oppure Chiuso" },
        },
        required: ["day", "time"],
      },
    },
    images: {
      type: "ARRAY",
      description: "URL https di foto (gallery)",
      items: { type: "STRING" },
    },
    rows: {
      type: "ARRAY",
      description: "Coppie etichetta/valore (info): password Wi-Fi, check-in, check-out, regole",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING", description: "Es. Password Wi-Fi" },
          value: { type: "STRING", description: "Es. Aurora2026" },
        },
        required: ["label", "value"],
      },
    },
  },
};

const FUNCTION_DECLARATIONS = [
  {
    name: "update_theme",
    description: "Cambia la palette del sito. Usa colori esadecimali #RRGGBB con contrasto leggibile.",
    parameters: {
      type: "OBJECT",
      properties: {
        bg_color: { type: "STRING", description: "Sfondo, es. #0b0b0f" },
        text_color: { type: "STRING", description: "Testo, es. #f5f5f5" },
        accent_color: { type: "STRING", description: "Accento per pulsanti e dettagli" },
        accent2: { type: "STRING", description: "Secondo accento per i gradienti" },
        style: {
          type: "STRING",
          enum: ["aurora", "neon", "editorial", "luxury", "glass", "minimal"],
          description: "Carattere visivo della pagina",
        },
        font: { type: "STRING", enum: ["sans", "serif", "mono"], description: "Famiglia tipografica" },
      },
    },
  },
  {
    name: "add_block",
    description: "Aggiunge una sezione alla pagina, nell'ordine indicato.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: {
          type: "STRING",
          enum: ["hero", "banner", "links", "catalog", "hours", "gallery", "info", "form", "contact"],
        },
        position: { type: "INTEGER", description: "Indice di inserimento, 0 = in cima" },
        data: BLOCK_DATA_SCHEMA,
      },
      required: ["type", "data"],
    },
  },
  {
    name: "update_block",
    description: "Modifica un blocco esistente: i campi inviati sostituiscono quelli attuali.",
    parameters: {
      type: "OBJECT",
      properties: {
        block_id: { type: "STRING" },
        data: BLOCK_DATA_SCHEMA,
      },
      required: ["block_id", "data"],
    },
  },
  {
    name: "delete_block",
    description: "Elimina una sezione.",
    parameters: {
      type: "OBJECT",
      properties: { block_id: { type: "STRING" } },
      required: ["block_id"],
    },
  },
  {
    name: "reorder_blocks",
    description: "Riordina le sezioni elencando tutti gli id nel nuovo ordine.",
    parameters: {
      type: "OBJECT",
      properties: { order_array: { type: "ARRAY", items: { type: "STRING" } } },
      required: ["order_array"],
    },
  },
  {
    name: "ask_user",
    description:
      "Mostra un modulo con campi compilabili quando servono dati reali (telefono, WhatsApp, Instagram, indirizzo, orari, logo o foto). Usalo invece di scrivere la domanda nel testo.",
    parameters: {
      type: "OBJECT",
      properties: {
        intro: { type: "STRING", description: "Frase breve che spiega a cosa servono i dati" },
        fields: {
          type: "ARRAY",
          description: "Massimo 4 campi, solo quelli che mancano davvero",
          items: {
            type: "OBJECT",
            properties: {
              key: { type: "STRING", description: "Identificatore breve, es. whatsapp" },
              label: { type: "STRING", description: "Etichetta visibile, es. Numero WhatsApp" },
              type: {
                type: "STRING",
                enum: ["text", "tel", "email", "url", "number", "textarea", "image"],
                description: "Usa tel per telefoni, url per link, image per logo o foto",
              },
              placeholder: { type: "STRING" },
              required: { type: "BOOLEAN" },
            },
            required: ["key", "label", "type"],
          },
        },
      },
      required: ["fields"],
    },
  },
  {
    name: "set_meta",
    description: "Imposta titolo e descrizione della pagina (SEO e scheda link).",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        description: { type: "STRING" },
      },
    },
  },
];

const SYSTEM_PROMPT = `Sei Nova, l'assistente che costruisce landing page mobile per piccole attività.
Usa le funzioni per modificare il sito. Obiettivo: una pagina completa, ordinata e pronta da pubblicare.

COME COSTRUIRE UNA PAGINA COMPLETA
- Se l'utente descrive un'attività (bar, negozio, parrucchiere, palestra, freelance, reseller) e la pagina è quasi vuota, costruisci più sezioni in una sola risposta, in questo ordine tipico:
  hero (titolo, sottotitolo, badge) → banner (solo se c'è una promo) → links (i pulsanti richiesti) → catalog (prodotti, servizi o menu) → hours (orari) → gallery (solo con foto reali) → contact.
- Ogni sezione deve avere contenuti reali. Se un blocco resterebbe vuoto, non aggiungerlo.
- Non duplicare sezioni dello stesso tipo già presenti: aggiorna quelle esistenti con update_block.

QUALITÀ DEI TESTI
- Titolo: massimo 6 parole. Sottotitolo: massimo 140 caratteri, concreto e senza slogan vuoti.
- Pulsanti: verbi chiari ("Prenota un tavolo", "Vedi il menù", "Scrivici su WhatsApp").
- Per ogni pulsante scegli l'icona adatta: whatsapp, instagram, tiktok, pin per le mappe, pdf per il menù, phone, email, globe, calendar per prenotazioni, shop. Metti variant "primary" sull'azione di contatto o prenotazione (tipicamente WhatsApp) e "ghost" sulle altre.
- Se c'è un banner promozionale, mettilo come prima sezione della pagina, sopra il titolo.
- Nessun testo segnaposto tipo "Lorem ipsum", "titolo qui", "testo".

INFORMAZIONI NON-LINK (blocco info)
- Password Wi-Fi, codici di accesso, orari di check-in/check-out, regole della casa, numeri utili sono dati testuali: vanno nel blocco "info" come righe {label, value}.
- Non mettere mai testi, password o codici nel campo url di un pulsante. Usa solo URL https reali; mai schemi come javascript: o data:.
- Se un pulsante esistente contiene un dato che non è un link (es. "Password Wi-Fi: Aurora2026"), sposta quel dato in un blocco info e lascia al pulsante solo un'azione reale.

ADATTA LA PAGINA AL SETTORE
- Prima di modificare, identifica il tipo di attività e scegli solo le sezioni che servono davvero.
- Casa vacanze / B&B: hero di benvenuto, info (Wi-Fi, check-in, check-out, regole), gallery, links (mappa, ristoranti, guida), form per feedback e richieste di checkout. Niente vetrina prodotti né orari di negozio.
- Bar / ristorante: banner promozioni, catalog come menù, hours, links (menù PDF, mappa, WhatsApp).
- Negozio / reseller: catalog con prezzi, banner per i drop, links social, hours, contact.
- Creator / professionista: links social, gallery, catalog come servizi, form per preventivi.

MODULO CONTATTI
- Il blocco "form" mostra un modulo che salva nome, email, telefono e messaggio nella sezione contatti dell'utente.
- Usa "form" quando l'utente vuole raccogliere richieste, preventivi o prenotazioni; usa "contact" solo per mostrare i suoi recapiti.

CAPACITÀ DI LAYOUT
- Il catalogo e la galleria accettano il campo layout: "grid" (griglia), "list" (righe), "carousel" (scorrimento orizzontale).
- Se l'utente chiede un carosello, una galleria scorrevole o uno slider, imposta layout "carousel" sul blocco interessato.

ONESTÀ
- Ogni modifica che annunci deve corrispondere a una chiamata di funzione. Non dire "ho fatto" qualcosa che non hai fatto.
- Se una richiesta non è realizzabile con queste funzioni, spiegalo in una frase e proponi l'alternativa più vicina invece di fingere.

DATI REALI
- Non inventare URL, numeri di telefono, WhatsApp, indirizzi o foto.
- Se aggiungi prodotti, voci di menù, prezzi o orari non forniti dall'utente, trattali come esempi e scrivilo nella risposta ("i prodotti sono esempi da modificare").
- Se un dato manca, ometti quel campo o lascia url vuoto ("") e chiedilo con lo strumento ask_user, non nel testo.

CAMPI DI RISPOSTA (ask_user)
- Quando servono telefono, WhatsApp, email, Instagram o altri social, indirizzo, orari, logo o foto, chiama ask_user con i campi necessari: l'utente li compila e non deve scriverli a mano.
- Massimo 4 campi per chiamata. Usa type "image" per logo e foto, "tel" per i numeri, "url" per i profili social, "textarea" per testi lunghi.
- Chiama ask_user solo per dati reali che ti servono davvero e che non hai già ricevuto prima.
- Le risposte arrivano come messaggio utente in forma "- Etichetta: valore": applicale subito alla pagina aggiornando i blocchi interessati.
- Formati: WhatsApp https://wa.me/393331234567 ; mappa https://www.google.com/maps/search/?api=1&query=INDIRIZZO ; sito o PDF https:// indirizzo completo.
- Non inserire immagini se non hai un URL reale fornito dall'utente.

UNICITÀ E PERSONALITÀ
- Ogni pagina deve sembrare fatta su misura: titolo con il nome reale dell'attività, sottotitolo specifico su cosa offre e a chi.
- Adatta la composizione al settore: bar/ristorante → promozione o menù in evidenza + orari; reseller → banner per il drop + vetrina; creator → link social + galleria; servizi → listino + orari + contatti; negozio → articoli + mappa.
- Cambia l'ordine delle sezioni da una pagina all'altra: non usare sempre lo stesso schema.
- Vengono vietate le frasi generiche: "Scopri i nostri servizi", "Contattaci per maggiori informazioni", "Benvenuti nel nostro sito", "La tua attività".
- Sostituisci sempre i segnaposto ("Nome attività", "Una frase che spiega cosa fai") con contenuti reali.

STILE
- Cambia i colori solo se richiesto; mantieni contrasto alto tra sfondo e testo.
- Se l'utente nomina un colore, usa il valore esatto: nero #000000, bianco #ffffff, rosso #ef4444, blu #3b82f6, verde #22c55e, viola #8b5cf6, oro #d4af37, grigio #71717a.
- Se la richiesta non cambia nulla (colore già uguale, elemento già presente, testo identico), non chiamare funzioni e rispondi in una frase dicendo che non serve alcuna modifica.
- Se l'utente chiede un colore per un singolo pulsante, imposta il campo color di quel pulsante invece di cambiare il tema.
- Rispondi con una o due frasi: cosa hai cambiato e, se serve, la domanda secca sui dati mancanti.
- Se la richiesta non riguarda il sito, non chiamare funzioni e spiega in una frase cosa puoi fare.`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY non configurata" }, { status: 500 });
  }
  const key = apiKey;

  const body = (await req.json().catch(() => null)) as {
    siteId?: string;
    message?: string;
    images?: string[];
    answerFor?: string;
    answers?: Record<string, string>;
  } | null;

  const siteId = body?.siteId;
  const message = body?.message?.trim() ?? "";
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Messaggio troppo lungo (max 2000 caratteri): dividilo in più richieste." },
      { status: 400 },
    );
  }
  const images = (body?.images ?? [])
    .filter((u) => typeof u === "string" && u.startsWith("/uploads/"))
    .slice(0, 6);
  if (!siteId || (!message && !images.length)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });

  const limit = await rateLimit(`chat:${user.id}`, 40, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Troppi messaggi in poco tempo. Riprova tra ${limit.retryAfter} secondi.` },
      { status: 429 },
    );
  }

  const record = await getSite(siteId);
  if (!record || record.ownerId !== user.id) {
    return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
  }

  if (body?.answerFor && body.answers) {
    await setChatAnswers(siteId, body.answerFor, body.answers);
  }

  const conversation = await getChat(siteId);
  const conversationContext = buildConversationContext(conversation);

  type Part = {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
  };
  type Turn = { role: "user" | "model"; parts: Part[] };

  const wantsNewLook =
    record.config.blocks.length <= 1 ||
    /nuov[oa] pagina|rifai|ridisegna|nuovo stile|riparti|da zero|restyling/i.test(message);
  const direction = wantsNewLook
    ? DESIGN_DIRECTIONS[Math.floor(Math.random() * DESIGN_DIRECTIONS.length)]
    : null;

  const requestText = [
    conversationContext ? `CONTESTO CONVERSAZIONE:\n${conversationContext}` : "",
    `Stato attuale del sito (JSON):\n${JSON.stringify(record.config)}`,
    `Sezioni presenti: ${record.config.blocks.map((b) => b.type).join(", ") || "nessuna"}`,
    images.length
      ? `IMMAGINI APPENA CARICATE (usale esattamente con questi URL in avatar, gallery o items.image):\n${images.join("\n")}`
      : "",
    `Richiesta: ${message || "Usa queste foto nella pagina nel modo più adatto."}`,
    direction
      ? `DIREZIONE CREATIVA OBBLIGATORIA PER QUESTA PAGINA:\n- Stile visivo: ${direction.style}, font ${direction.font}\n- Palette: sfondo ${direction.bg}, testo ${direction.text}, accento ${direction.accent}, secondo accento ${direction.accent2}\n- Tono: ${direction.tone}\nChiama update_theme con questi valori e costruisci la pagina con questo carattere. Se l'utente ha indicato colori espliciti, quelli hanno la precedenza.`
      : "",
    colorDirective(message) ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const contents: Turn[] = [{ role: "user", parts: [{ text: requestText }] }];

  async function callGemini(turns: Turn[]) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: turns,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      }),
    });
    return res;
  }

  let site: Site = record.config;
  const calls: ToolCall[] = [];
  const texts: string[] = [];
  let ask: Ask | null = null;
  const MAX_ROUNDS = 6;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await callGemini(contents);

    if (!res.ok) {
      // Se abbiamo già applicato qualcosa, restituiamo la pagina aggiornata invece di perdere tutto.
      if (calls.length) {
        const fallback = texts.join(" ").trim() || "Ho aggiornato la pagina.";
        await updateSite(siteId, { config: site });
        const messages = await appendChat(siteId, [
          { role: "user", text: message || "Ho caricato delle foto.", images },
          { role: "assistant", text: fallback, ask: ask ?? undefined },
        ]);
        return NextResponse.json({ site, reply: fallback, calls, ask, messages });
      }
      await logError({
        source: "chat",
        message: `Gemini ${res.status}`,
        detail: await res.clone().text().catch(() => ""),
        userId: user.id,
      });

      if (res.status === 429) {
        return NextResponse.json(
          { error: "Limite Gemini raggiunto (429): quota o frequenza esaurita. Riprova tra un minuto o controlla la quota nel tuo progetto Google AI Studio." },
          { status: 429 },
        );
      }
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Errore Gemini (${res.status}) con modello "${MODEL}": ${detail.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const parts: Part[] = data?.candidates?.[0]?.content?.parts ?? [];
    const roundCalls = parts.filter((p) => p.functionCall);
    const text = parts
      .map((p) => p.text ?? "")
      .join("")
      .trim();

    if (text) texts.push(text);
    if (!roundCalls.length) break;

    const askPart = roundCalls.find((p) => p.functionCall!.name === "ask_user");
    const siteParts = roundCalls.filter((p) => p.functionCall!.name !== "ask_user");
    const parsed: ToolCall[] = siteParts.map((p) => ({
      name: p.functionCall!.name,
      args: p.functionCall!.args ?? {},
    }));
    calls.push(...parsed);
    site = applyToolCalls(site, parsed);

    // Restituiamo al modello l'esito delle funzioni e lo invitiamo a completare la pagina.
    contents.push({ role: "model", parts: roundCalls });
    contents.push({
      role: "user",
      parts: roundCalls.map((p) => ({
        functionResponse: { name: p.functionCall!.name, response: { result: "ok" } },
      })),
    });

    // Se il modello chiede dati, mostriamo il modulo e fermiamo il ciclo: aspettiamo l'utente.
    if (askPart) {
      ask = normalizeAsk(askPart.functionCall!.args);
      if (ask) break;
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: wantsNewLook
            ? `Pagina aggiornata. Sezioni presenti ora: ${
                site.blocks.map((b) => b.type).join(", ") || "nessuna"
              }. Se mancano sezioni utili all'attività richiesta, aggiungile o aggiorna quelle esistenti (senza duplicati). Quando la pagina è completa rispondi solo con una conferma breve, senza chiamare funzioni.`
            : `Pagina aggiornata. Sezioni presenti ora: ${
                site.blocks.map((b) => b.type).join(", ") || "nessuna"
              }. Completa solo ciò che serve a soddisfare la richiesta dell'utente: non aggiungere sezioni non richieste. Quando hai finito rispondi con una conferma breve, senza chiamare funzioni.`,
        },
      ],
    });
  }

  const changed = JSON.stringify(site) !== JSON.stringify(record.config);
  const reply = texts.join(" ").replace(/\s+/g, " ").trim();
  let finalReply =
    reply || (changed || ask ? "Fatto, ho aggiornato la pagina." : "Non ho capito, puoi riformulare?");

  // Se nulla è cambiato non lasciamo che la risposta dica «fatto».
  if (!changed && !ask && claimsChange(finalReply)) finalReply = NO_CHANGE_REPLY;

  if (changed) await updateSite(siteId, { config: site });
  const messages = await appendChat(siteId, [
    { role: "user", text: message || "Ho caricato delle foto.", images },
    { role: "assistant", text: finalReply, ask: ask ?? undefined },
  ]);

  return NextResponse.json({ site, reply: finalReply, calls, ask, messages });
}
