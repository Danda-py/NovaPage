# NovaPage

Landing page mobile generate e modificate via chat, con database Postgres (Neon).

L'utente descrive la propria attività, l'assistente (Gemini, function calling) costruisce il JSON
della pagina e l'editor la mostra in tempo reale. Lo stesso JSON si modifica a mano dal pannello
"Modifica a mano" e si pubblica su `/s/{slug}`.

## Stack

- Next.js 16 (App Router, Cache Components, Turbopack) + React 19
- Tailwind CSS 4
- Neon Postgres (`@neondatabase/serverless`)
- Gemini API per generazione e modifica delle pagine
- Vercel Blob per le immagini caricate, Resend per le email transazionali

## Setup

```bash
cp .env.example .env.local
openssl rand -hex 32   # valore per AUTH_SECRET
npm install
```

Variabili lette dal codice (solo lato server, nessun `NEXT_PUBLIC_` tranne l'URL pubblico):

| Variabile | Uso | Obbligatoria |
| --- | --- | --- |
| `DATABASE_URL` | connection string **pooled** di Neon | sì |
| `AUTH_SECRET` | firma dei cookie di sessione | sì in produzione |
| `GEMINI_API_KEY` | generazione e modifica delle pagine (Google AI Studio) | sì, se non usi Vertex |
| `GEMINI_MODEL` | default `gemini-3.5-flash-lite` | no |
| `AI_PROVIDER` | `gemini` o `vertex`; dedotto dalle credenziali | no |
| `GOOGLE_VERTEX_API_KEY` | Vertex AI in express mode (stesso formato Gemini) | alternativa a `GEMINI_API_KEY` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | service account Vertex (JSON o base64) | alternativa all'API key |
| `GOOGLE_VERTEX_PROJECT` / `GOOGLE_VERTEX_LOCATION` | progetto e regione Vertex (default `global`) | con service account |
| `AI_MODEL` / `AI_MODEL_PAGE` | modello per correzioni e per pagine nuove | no |
| `AI_MAX_OUTPUT_TOKENS` / `AI_THINKING_BUDGET` | limiti di output e ragionamento | no |
| `BLOB_READ_WRITE_TOKEN` | storage immagini su Vercel Blob | sì in produzione |
| `RESEND_API_KEY` + `EMAIL_FROM` | reset password via email | per il recupero password |
| `NEXT_PUBLIC_SITE_URL` | URL pubblico per sitemap, OpenGraph e link nelle email | sì in produzione |
| `ANALYTICS_SALT` | sale dell'impronta dei visitatori unici (default `novapage`) | no |
| `ALLOW_LOCAL_UPLOADS` | consente il salvataggio su disco anche in produzione | no |
| `CLAIM_LEGACY_SITES` | `1` assegna al primo iscritto i siti creati prima degli account | no (una tantum) |

In produzione `AUTH_SECRET` mancante è un errore esplicito, non un fallback silenzioso: su Vercel il
filesystem è read-only e il login fallirebbe. Anche il link di reset password usa solo
`NEXT_PUBLIC_SITE_URL` (mai l'header `Origin` della richiesta).

## Costi dell'assistente

- Le pagine nuove usano `AI_MODEL_PAGE`, le correzioni `AI_MODEL` (default `gemini-3.5-flash-lite`).
- `AI_THINKING_BUDGET=0` (default) spegne il ragionamento, che viene fatturato come output.
- `AI_MAX_OUTPUT_TOKENS` limita l'output: 4096 per le correzioni, 32000 per una pagina nuova.
- `AI_MAX_ROUNDS` (default 4) limita i giri di tool calling: ogni giro rimanda istruzioni e stato.
- Su una pagina in HTML libero si inviano solo estratto e struttura: i blocchi completi non vengono
  più serializzati a ogni turno.
- La tabella `ai_usage` registra i token di ogni richiesta; il totale del mese è in `/account`.
- Vertex AI parla lo stesso protocollo di Gemini: basta `GOOGLE_VERTEX_API_KEY` (express mode) oppure
  un service account, senza toccare il codice.

## Database

```bash
# installazione nuova
node --env-file=.env.local scripts/schema.mjs

# database già esistente (aggiunge analytics, rate limit, reset, consenso, sessioni versionate)
node --env-file=.env.local scripts/migrate-v2.mjs

# stato di pubblicazione delle pagine (bozza/pubblicata)
node --env-file=.env.local scripts/migrate-v3.mjs

# cronologia delle versioni delle pagine
node --env-file=.env.local scripts/migrate-v4.mjs

# gestione dei contatti: stato, nota privata, data di risposta
node --env-file=.env.local scripts/migrate-v5.mjs

# consumo dei token dell'assistente
node --env-file=.env.local scripts/migrate-v6.mjs

# controllo che un database in uso abbia tutte le colonne richieste
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/verify.sql

# dati del vecchio store JSON (solo prima migrazione)
node --env-file=.env.local scripts/migrate.mjs
```

La landing demo `/s/casa-aurora` è contenuto pubblico e resta senza proprietario:

```bash
node --env-file=.env.local scripts/seed-demo.mjs
```

Retenzione dati (da schedulare con un cron): log applicativi 90 giorni, analytics 365 giorni,
token di reset e contatori scaduti.

```bash
npm run db:prune
```

Tabelle: `users`, `sites`, `leads`, `chat_messages`, `site_views`, `site_events`, `rate_limits`,
`password_resets`, `error_logs`.

## Comandi

```bash
npm run dev        # sviluppo
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # test unitari (vitest, nessuna chiamata di rete)
npm run smoke:ai   # test dell'assistente contro l'istanza attiva (usa Gemini, costa token)
npm run build      # build di produzione
npm run db:prune   # retention dati
npm run check:env  # variabili di .env.production.local (solo nomi, mai valori)
npm run seo:audit  # crawl di sitemap.xml: title, canonical, OG, JSON-LD, duplicati
```

`smoke:ai` crea un account temporaneo, esegue tre richieste reali (comando complesso, correzione di
contesto, contenuti lunghi con caratteri speciali), valida il JSON risultante e cancella l'account.
Va lanciato a mano o in una job notturna, non a ogni commit. La CI
(`.github/workflows/ci.yml`) esegue lint, typecheck, test e build.

## Note

- **Assistente**: la chat dichiara di essere un'intelligenza artificiale (AI Act, art. 50); i colori
  nominati sono mappati su esadecimali esatti; ogni pulsante può avere un colore proprio; se la
  richiesta non produce modifiche la risposta lo dice invece di confermare un falso aggiornamento.
- **Editor**: chat e pannello manuale scrivono lo stesso JSON del sito; le modifiche si salvano da
  sole con debounce e il client non può salvare blocchi sconosciuti, colori non validi o URL
  pericolosi (validazione lato server con `normalizeSite`).
- **Health check**: `GET /api/health` risponde 200 con `{ ok, checks }` (database, auth, IA, email,
  storage) e 503 se il database non risponde. Solo booleani, nessun segreto.
- **Duplicazione**: dalla dashboard una pagina si copia in un nuovo progetto (nuovi id dei blocchi,
  slug derivato dal titolo), utile per riusare una struttura tra più attività.
- **Prima di pubblicare**: la pagina statistiche elenca i controlli ancora aperti (titolo
  segnaposto, descrizione corta, nessun contatto, pulsanti senza URL, dati del titolare mancanti
  quando ci sono prezzi). Sono avvisi, non blocchi.
- **Pubblicazione**: ogni pagina si pubblica o si mette in bozza dalla pagina statistiche. Una bozza
  risponde 404 sul link pubblico, non entra in `sitemap.xml` e non espone contenuti nell'immagine
  OpenGraph.
- **Contatti**: ogni nuovo messaggio arriva anche via email al titolare (con `RESEND_API_KEY` e
  `EMAIL_FROM` configurate); dalla pagina statistiche si esportano in CSV, con escape delle formule,
  e si eliminano singolarmente.
- **Password**: si cambia anche dalla dashboard senza passare dall'email; le sessioni aperte sugli
  altri dispositivi vengono disconnesse (la sessione corrente viene rinnovata).
- **Rate limit**: contatori in Postgres (`rate_limits`), quindi validi anche con più istanze
  serverless. Limiti su login, registrazione, reset, caricamento immagini, chat (40/ora), contatti
  (10/ora per sito e IP).
- **Analytics**: una riga per visita e per clic (`site_views`, `site_events`), serie giornaliera a
  30 giorni nella pagina statistiche. Nessun cookie di profilazione: solo un flag di `sessionStorage`
  per non contare due volte la stessa visita.
- **Consenso e termini**: il modulo contatti richiede l'informativa `/privacy`; la registrazione
  richiede l'accettazione dei `/termini` (data salvata su `users.terms_accepted_at`). Pagine legali:
  `/privacy`, `/termini`, `/cookie`; il footer pubblico mostra ragione sociale, P.IVA e sede se
  compilati. Il titolare può eliminare un singolo contatto dalla pagina statistiche.
- **Prezzi in sconto**: le schede prodotto accettano `compareAtPrice` e `lowestPrice30`; se c'è uno
  sconto la pagina mostra anche il prezzo minimo dei 30 giorni precedenti (direttiva Omnibus).
- **Sessioni**: firmate HMAC e versionate; cambiare password disconnette le sessioni esistenti. Le
  password sono hashate con scrypt asincrono.
- **Immagini**: senza `BLOB_READ_WRITE_TOKEN` finiscono in `public/uploads` (solo sviluppo locale).
  Su serverless non sono persistenti.
- **Errori**: gli errori non gestiti finiscono in `error_logs` tramite `instrumentation.ts`, con
  confini di errore dedicati (`app/error.tsx`, `app/global-error.tsx`).
- **HTML libero**: una landing può essere a blocchi oppure in HTML/CSS libero (`Site.html`), scritto dall'IA con `write_html` o incollato nella scheda HTML dell'editor. È reso inline nella pagina pubblica, non in un iframe, quindi resta indicizzabile. Gli script vengono rimossi (girerebbero con i cookie dell'app); restano i dati strutturati JSON-LD validi e tutti gli stili. Limite 120.000 caratteri. Nella scheda HTML c'è la lista dei controlli legali (titolare e P.IVA, privacy, cookie, prezzi, diritti su immagini, accessibilità): l'utente è responsabile di ciò che pubblica.
- **SEO delle landing**: titolo e descrizione editabili (usati in `<title>`, OG e Twitter),
  canonical `/s/{slug}`, `robots` con `max-image-preview: large`, immagine OpenGraph 1200×630 generata
  dal tema della pagina, `theme-color` dallo sfondo, sitemap con `lastModified` e dati strutturati
  schema.org (`WebPage`, `BreadcrumbList`, `Organization`/`LocalBusiness`/`Store`, `ItemList` di
  prodotti con prezzo e disponibilità, `sameAs` dei social linkati). Le bozze sono escluse da
  sitemap, rispondono 404 e non vengono indicizzate.
- **Audit SEO**: `npm run seo:audit -- --base-url=https://novapage.site` scarica la sitemap e
  controlla ogni pagina (title e description nelle lunghezze consigliate, canonical coerente, OG e
  Twitter, `noindex` indesiderati, JSON-LD valido con `WebPage` e nodo attività, immagine social
  raggiungibile, title/description duplicati). Esce con codice 1 sugli errori ed è in CI dopo la build.
- **SEO del sito**: metadata completi e canonici per la home e le pagine legali, immagine OpenGraph
  dedicata, `FAQPage` + `SoftwareApplication` + `Organization` in JSON-LD, `robots.txt` che esclude
  dashboard, editor, statistiche, login, recupero e reset password (`noindex` anche nei metadata).
- **Header di sicurezza**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` e HSTS in produzione, impostati in `next.config.ts`.

## Deploy su Vercel

Imposta tutte le variabili in *Settings → Environment Variables*, esegui `scripts/schema.mjs` (o
`migrate-v2.mjs`) sul database di produzione, schedula `scripts/prune.mjs` e pubblica. Senza
`BLOB_READ_WRITE_TOKEN` gli upload rispondono 503 con messaggio esplicito.
