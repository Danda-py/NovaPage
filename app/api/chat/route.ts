import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { applyToolCalls, normalizeAsk, withLegalAck } from "@/lib/site";
import type { Ask, Site, ToolCall } from "@/lib/site";
import {
  appendChat,
  getChat,
  getSite,
  logError,
  recordAiUsage,
  saveMessageVersion,
  setChatAnswers,
  updateSite,
} from "@/lib/store";
import { buildConversationContext } from "@/lib/context";
import { claimsChange, NO_CHANGE_REPLY } from "@/lib/chat-guards";
import { colorDirective } from "@/lib/colors";
import { htmlOutline, validateHtml } from "@/lib/html";
import { sanitizeHtmlStrict } from "@/lib/html-strict";
import { riskyMarkup } from "@/lib/moderation";
import { getCurrentUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/secure";
import { rateLimit } from "@/lib/rate-limit";
import {
  aiConfigured,
  aiTarget,
  generationConfig,
  readUsage,
  type AiIntent,
  type AiTarget,
} from "@/lib/ai";
import { SYSTEM_PROMPT } from "@/lib/ai-prompt";

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
  { style: "brutal", font: "sans", bg: "#f2f0eb", text: "#111111", accent: "#ff4d00", accent2: "#111111", tone: "poster, graffiante, giovanile" },
  { style: "paper", font: "serif", bg: "#fbf8f1", text: "#2b2118", accent: "#7c2d12", accent2: "#a8a29e", tone: "carta, caldo, artigianale" },
  { style: "mono", font: "mono", bg: "#0c0c0c", text: "#e8e8e8", accent: "#84cc16", accent2: "#3f3f46", tone: "tecnico, terminale, preciso" },
  { style: "sunset", font: "sans", bg: "#160a12", text: "#fff4ec", accent: "#fb7185", accent2: "#fbbf24", tone: "caldo, cinematografico, accogliente" },
  { style: "forest", font: "serif", bg: "#0c1712", text: "#eefaf1", accent: "#34d399", accent2: "#a3e635", tone: "naturale, calmo, biologico" },
  { style: "chrome", font: "sans", bg: "#101114", text: "#f8fafc", accent: "#94a3b8", accent2: "#38bdf8", tone: "metallico, deciso, hi-tech" },
  { style: "pastel", font: "sans", bg: "#fdf7fb", text: "#2b2438", accent: "#c084fc", accent2: "#7dd3fc", tone: "dolce, chiaro, curato" },
  { style: "riso", font: "sans", bg: "#f6f2e8", text: "#14110c", accent: "#ef4444", accent2: "#2563eb", tone: "stampa d'autore, grafico, ironico" },
  { style: "blueprint", font: "mono", bg: "#071b2e", text: "#e6f3ff", accent: "#60a5fa", accent2: "#93c5fd", tone: "progetto tecnico, preciso, ingegneristico" },
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
          copy: {
            type: "BOOLEAN",
            description:
              "true solo se l'utente vuole il pulsante Copia accanto a questo valore (es. 'metti un tasto copia sulla password Wi-Fi'); false o assente per toglierlo.",
          },
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
          enum: [
            "aurora",
            "neon",
            "editorial",
            "luxury",
            "glass",
            "minimal",
            "brutal",
            "paper",
            "mono",
            "sunset",
            "forest",
            "chrome",
            "pastel",
            "riso",
            "blueprint",
          ],
          description:
            "Carattere visivo: aurora (gradiente morbido), neon (scuro e acceso), editorial (rivista), luxury (raffinato), glass (vetro), minimal (sobrio), brutal (poster con bordi netti), paper (carta chiara), mono (tecnico), sunset (tramonto caldo, gradiente ampio), forest (naturale, verde e aria), chrome (metallico, contrasto alto, maiuscole), pastel (chiaro, tondeggiante, delicato), riso (stampa a due inchiostri, puntinato), blueprint (progetto tecnico, griglia sottile)"
        },
        font: { type: "STRING", enum: ["sans", "serif", "mono"], description: "Famiglia tipografica" },
      },
    },
  },
  {
    name: "set_block",
    description:
      "Crea una sezione (senza block_id) oppure aggiorna quella indicata (con block_id): i campi inviati sostituiscono i valori attuali.",
    parameters: {
      type: "OBJECT",
      properties: {
        block_id: {
          type: "STRING",
          description: "Id della sezione da aggiornare; ometti quando crei una sezione nuova",
        },
        type: {
          type: "STRING",
          enum: ["hero", "banner", "links", "catalog", "hours", "gallery", "info", "form", "contact"],
          description: "Tipo della sezione, solo in creazione",
        },
        position: { type: "INTEGER", description: "Indice di inserimento in creazione, 0 = in cima" },
        data: BLOCK_DATA_SCHEMA,
      },
      required: ["data"],
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
    name: "write_html",
    description:
      "Riscrive l'intera pagina in HTML e CSS liberi, senza schema a blocchi. È lo strumento per progettare una landing su misura. Non inserire <script>: viene rimosso.",
    parameters: {
      type: "OBJECT",
      properties: {
        html: {
          type: "STRING",
          description:
            "Frammento di body: un <style> iniziale e poi il markup completo della pagina. Responsive, mobile first, massimo 120000 caratteri.",
        },
        title: { type: "STRING", description: "Titolo SEO della pagina, massimo 60 caratteri" },
        description: {
          type: "STRING",
          description: "Meta description per Google e per l'anteprima dei link, massimo 160 caratteri",
        },
      },
      required: ["html"],
    },
  },
  {
    name: "patch_html",
    description:
      "Modifica mirata di una pagina già in HTML: sostituisce frammenti esatti invece di riscrivere tutto. Usalo per testi, colori, prezzi, singole sezioni. `find` deve essere esatto e unico quanto basta.",
    parameters: {
      type: "OBJECT",
      properties: {
        patches: {
          type: "ARRAY",
          description: "Massimo 12 sostituzioni, ognuna su un frammento diverso.",
          items: {
            type: "OBJECT",
            properties: {
              find: { type: "STRING", description: "Testo esatto da cercare, markup compreso" },
              replace: { type: "STRING", description: "Testo che lo sostituisce" },
            },
            required: ["find", "replace"],
          },
        },
      },
      required: ["patches"],
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

/**
 * Non tutte le funzioni servono in ogni momento: mandare solo quelle pertinenti
 * al tipo di pagina riduce lo schema dei tool a ogni round (e quindi i token).
 */
const TOOL_SETS: Record<"html" | "blocks", string[]> = {
  html: ["write_html", "patch_html", "set_meta", "update_theme", "ask_user"],
  blocks: ["update_theme", "set_block", "delete_block", "reorder_blocks", "set_meta", "ask_user"],
};

function toolsFor(mode: "html" | "blocks") {
  const allowed = new Set(TOOL_SETS[mode]);
  return FUNCTION_DECLARATIONS.filter((tool) => allowed.has(tool.name));
}



export async function POST(req: Request) {
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

  // Chiave dell'account, se l'utente ne ha salvata una: le spese vanno sul suo progetto.
  const userAiKey = decryptSecret(user.geminiKeyCipher);
  if (!aiConfigured(userAiKey)) {
    return NextResponse.json(
      {
        error:
          "Assistente AI non configurato: aggiungi la tua chiave Gemini in Account, oppure imposta GEMINI_API_KEY sul server.",
      },
      { status: 500 },
    );
  }

  const userId = user.id;
  const limit = await rateLimit(`chat:${userId}`, 40, 60 * 60 * 1000);
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

  const wantsNewLook =
    record.config.blocks.length <= 1 ||
    /nuov[oa] pagina|rifai|ridisegna|nuovo stile|riparti|da zero|restyling/i.test(message);

  const conversation = await getChat(siteId);
  const conversationContext = buildConversationContext(
    conversation,
    wantsNewLook ? undefined : { recent: 4, recap: 8 },
  );

  type Part = {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
  };
  type Turn = { role: "user" | "model"; parts: Part[] };

  const direction = wantsNewLook
    ? DESIGN_DIRECTIONS[Math.floor(Math.random() * DESIGN_DIRECTIONS.length)]
    : null;

  // L'HTML può essere molto lungo: al modello serve la struttura, non tutto il CSS.
  // Di una pagina in HTML libero non si mandano i blocchi completi: sono inutilizzati
  // e occupano token a ogni turno.
  const htmlState = record.config.html
    ? {
        meta: record.config.meta,
        theme: record.config.theme,
        legal: record.config.legal,
        blockTypes: record.config.blocks.map((block) => block.type),
        html: `${record.config.html.slice(0, 1200)}\n…(troncato)\n${htmlOutline(record.config.html)}`,
      }
    : record.config;

  const requestText = [
    conversationContext ? `CONTESTO CONVERSAZIONE:\n${conversationContext}` : "",
    `Stato attuale del sito (JSON):\n${JSON.stringify(htmlState)}`,
    record.config.html
      ? `La pagina è in HTML libero (${record.config.html.length} caratteri): per modificarla riscrivi il documento completo con write_html.`
      : `Sezioni presenti: ${record.config.blocks.map((b) => b.type).join(", ") || "nessuna"}`,
    images.length
      ? `IMMAGINI APPENA CARICATE (usale esattamente con questi URL in avatar, gallery o items.image):\n${images.join("\n")}`
      : "",
    `Richiesta: ${message || "Usa queste foto nella pagina nel modo più adatto."}`,
    direction
      ? `DIREZIONE CREATIVA OBBLIGATORIA PER QUESTA PAGINA:\n- Stile visivo: ${direction.style}, font ${direction.font}\n- Palette: sfondo ${direction.bg}, testo ${direction.text}, accento ${direction.accent}, secondo accento ${direction.accent2}\n- Tono: ${direction.tone}\nSe scrivi HTML libero usa questa palette nel CSS; se lavori a blocchi chiama update_theme con questi valori. Se l'utente ha indicato colori espliciti, quelli hanno la precedenza.`
      : "",
    colorDirective(message) ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Un modello più capace solo quando si costruisce una pagina nuova: le correzioni
  // piccole restano sul modello economico.
  const intent: AiIntent = wantsNewLook ? "page" : "edit";
  let target: AiTarget;
  try {
    target = await aiTarget(intent, { apiKey: userAiKey });
  } catch (error) {
    await logError({
      source: "ai",
      message: "Configurazione provider AI non valida",
      detail: String(error),
      userId: user.id,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configurazione AI non valida" },
      { status: 500 },
    );
  }

  const usage = { prompt: 0, output: 0, cached: 0 };
  function addUsage(data: unknown) {
    const round = readUsage(data);
    usage.prompt += round.prompt;
    usage.output += round.output;
    usage.cached += round.cached;
  }
  async function flushUsage() {
    await recordAiUsage({
      userId,
      siteId,
      provider: target.provider,
      model: target.model,
      prompt: usage.prompt,
      output: usage.output,
      cached: usage.cached,
    });
  }

  const tools = toolsFor(record.config.html || wantsNewLook ? "html" : "blocks");
  const contents: Turn[] = [{ role: "user", parts: [{ text: requestText }] }];

  async function callGemini(turns: Turn[]) {
    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: turns,
      tools: [{ functionDeclarations: tools }],
      generationConfig: generationConfig(intent),
    };

    let res = await fetch(target.url, {
      method: "POST",
      headers: target.headers,
      body: JSON.stringify(payload),
    });

    // thinkingConfig non è accettato da tutti i modelli: è l'unico campo
    // opzionale che aggiungiamo, quindi al primo 400 si riprova senza.
    const config = payload.generationConfig as Record<string, unknown>;
    if (res.status === 400 && "thinkingConfig" in config) {
      const detail = await res.clone().text().catch(() => "");
      delete config.thinkingConfig;
      res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        await logError({
          source: "ai",
          message: `Riprova senza thinkingConfig: ${res.status}`,
          detail: detail.slice(0, 300),
          userId,
        });
      }
    }
    return res;
  }

  let site: Site = record.config;
  const calls: ToolCall[] = [];
  const texts: string[] = [];
  let ask: Ask | null = null;
  // Ogni round rimanda al modello istruzioni, schema dei tool e stato del sito:
  // meno round = meno token. Quattro bastano per una pagina completa.
  const MAX_ROUNDS = Math.min(8, Math.max(1, Number(process.env.AI_MAX_ROUNDS) || 4));

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await callGemini(contents);

    if (!res.ok) {
      // Se abbiamo già applicato qualcosa, restituiamo la pagina aggiornata invece di perdere tutto.
      if (calls.length) {
        const fallback = texts.join(" ").trim() || "Ho aggiornato la pagina.";
        // Anche questo percorso salva dell'HTML generato: senza gli stessi
        // controlli del percorso normale un errore a metà giro salverebbe una
        // pagina troncata, non sanificata o con un modulo di pagamento.
        let salvage = site;
        if (salvage.html) {
          salvage = { ...salvage, html: sanitizeHtmlStrict(salvage.html) };
          if (validateHtml(salvage.html ?? "").length || riskyMarkup(salvage.html ?? "")) {
            salvage = { ...salvage, html: record.config.html };
          }
        }
        site = salvage;
        await updateSite(siteId, { config: site });
        revalidateTag(`site:${record.slug}`, { expire: 0 });
        await flushUsage();
        const messages = await appendChat(siteId, [
          { role: "user", text: message || "Ho caricato delle foto.", images },
          { role: "assistant", text: fallback, ask: ask ?? undefined },
        ]);
        const saved = messages[messages.length - 1]?.id ?? null;
        if (saved) await saveMessageVersion(siteId, site, saved);
        return NextResponse.json({
          site,
          reply: fallback,
          calls,
          ask,
          messages,
          restorePoint: saved,
        });
      }
      await logError({
        source: "chat",
        message: `${target.label} ${res.status}`,
        detail: await res.clone().text().catch(() => ""),
        userId: user.id,
      });

      if (res.status === 429) {
        return NextResponse.json(
          {
            error: `Limite ${target.label} raggiunto (429): quota o frequenza esaurita. Riprova tra un minuto o controlla la quota del progetto.`,
          },
          { status: 429 },
        );
      }
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Errore ${target.label} (${res.status}) con modello "${target.model}": ${detail.slice(0, 300)}`,
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    addUsage(data);
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

    // Correzione mirata già completata: un altro giro rimanderebbe al modello
    // istruzioni, tool e stato del sito per migliaia di token, senza aggiungere nulla.
    if (text && !wantsNewLook && (site.html || site.blocks.length > 1)) break;

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

  // Un documento troncato a metà è peggio di nessuna modifica: si chiede una riparazione.
  if (site.html) {
    let problems = validateHtml(site.html);
    if (problems.length) {
      const repair = await callGemini([
        ...contents,
        {
          role: "user",
          parts: [
            {
              text: `L'HTML scritto è incompleto: ${problems.join("; ")}. Riscrivilo per intero con write_html, completo e chiuso, senza cambiare il design.`,
            },
          ],
        },
      ]).catch(() => null);

      if (repair?.ok) {
        const data = await repair.json().catch(() => null);
        if (data) addUsage(data);
        const fixed: ToolCall[] = ((data?.candidates?.[0]?.content?.parts ?? []) as Part[])
          .filter((part) => part.functionCall?.name === "write_html")
          .map((part) => ({ name: part.functionCall!.name, args: part.functionCall!.args ?? {} }));
        if (fixed.length) {
          site = applyToolCalls(site, fixed);
          calls.push(...fixed);
        }
      }

      problems = validateHtml(site.html ?? "");
      if (problems.length) {
        site = { ...site, html: record.config.html };
        texts.push("La pagina generata risultava incompleta e non l'ho salvata: ripeti la richiesta.");
      }
    }
  }

  if (site.html) site = { ...site, html: sanitizeHtmlStrict(site.html) };

  // Credenziali o carte in una pagina generata: si tiene la versione precedente.
  if (site.html && riskyMarkup(site.html)) {
    site = { ...site, html: record.config.html };
    texts.push(
      "La pagina conteneva un modulo che raccoglie password o dati di pagamento e non l'ho applicata: userei un link al tuo sistema di pagamento.",
    );
  }

  site = withLegalAck(record.config, site, {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const changed = JSON.stringify(site) !== JSON.stringify(record.config);
  const reply = texts.join(" ").replace(/\s+/g, " ").trim();
  let finalReply =
    reply || (changed || ask ? "Fatto, ho aggiornato la pagina." : "Non ho capito, puoi riformulare?");

  // Se nulla è cambiato non lasciamo che la risposta dica «fatto».
  if (!changed && !ask && claimsChange(finalReply)) finalReply = NO_CHANGE_REPLY;

  if (changed) {
    await updateSite(siteId, { config: site });
    revalidateTag(`site:${record.slug}`, { expire: 0 });
  }
  await flushUsage();
  const messages = await appendChat(siteId, [
    { role: "user", text: message || "Ho caricato delle foto.", images },
    { role: "assistant", text: finalReply, ask: ask ?? undefined },
  ]);

  // Punto di ripristino del turno: la pagina com'è adesso. L'id del messaggio è
  // ciò che l'utente vede in chat, quindi il tasto "Ripristina" sta lì.
  let restorePoint: string | null = null;
  if (changed) {
    const assistantMessageId = messages[messages.length - 1]?.id;
    if (assistantMessageId) {
      await saveMessageVersion(siteId, site, assistantMessageId);
      restorePoint = assistantMessageId;
    }
  }

  return NextResponse.json({ site, reply: finalReply, calls, ask, messages, restorePoint });
}
