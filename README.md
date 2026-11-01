NovaPage: landing page generate e modificate via chat, con database Postgres (Neon).

## Setup

```bash
cp .env.example .env.local
openssl rand -hex 32   # valore per AUTH_SECRET
npm install
```

Variabili richieste (solo lato server, mai con prefisso `NEXT_PUBLIC_` tranne l'URL pubblico):

| Variabile | Uso | Obbligatoria |
| --- | --- | --- |
| `DATABASE_URL` | connection string **pooled** di Neon | sì |
| `AUTH_SECRET` | firma dei cookie di sessione | sì in produzione |
| `GEMINI_API_KEY` | generazione e modifica delle pagine | sì |
| `GEMINI_MODEL` | default `gemini-3.5-flash-lite` | no |
| `BLOB_READ_WRITE_TOKEN` | storage immagini su Vercel Blob | sì in produzione |
| `RESEND_API_KEY` + `EMAIL_FROM` | reset password via email | per il recupero password |
| `NEXT_PUBLIC_SITE_URL` | URL pubblico per sitemap, OpenGraph ed email | sì in produzione |

In produzione `AUTH_SECRET` mancante è un errore esplicito, non un fallback silenzioso: su Vercel il filesystem è read-only e il login fallirebbe.

## Database

```bash
# installazione nuova
node --env-file=.env.local scripts/schema.mjs

# database già esistente (aggiunge analytics, rate limit, reset, consenso, sessioni versionate)
node --env-file=.env.local scripts/migrate-v2.mjs

# dati del vecchio store JSON (solo prima migrazione)
node --env-file=.env.local scripts/migrate.mjs
```

La landing demo `/s/casa-aurora` è contenuto pubblico e resta senza proprietario:

```bash
node --env-file=.env.local scripts/seed-demo.mjs
```

Tabelle: `users`, `sites`, `leads`, `chat_messages`, `site_views`, `site_events`, `rate_limits`, `password_resets`, `error_logs`.

## Comandi

```bash
npm run dev       # sviluppo
npm test          # test unitari (vitest, nessuna chiamata di rete)
npm run smoke:ai  # test dell'assistente contro l'istanza attiva (usa Gemini, costa token)
npm run build     # build di produzione
```

`smoke:ai` crea un account temporaneo, esegue tre richieste reali (comando complesso, correzione di contesto, contenuti lunghi con caratteri speciali), valida il JSON risultante e cancella l'account. Va lanciato a mano o in una job notturna, non a ogni commit.

## Note

- **Assistente**: la chat dichiara di essere un'intelligenza artificiale (AI Act, art. 50); i colori nominati sono mappati su esadecimali esatti; ogni pulsante può avere un colore proprio; se la richiesta non produce modifiche la risposta lo dice invece di confermare un falso aggiornamento.
- **Editor**: chat ed editor manuale scrivono lo stesso JSON del sito. Il pannello "Modifica a mano" permette testi, riordino dei blocchi (drag & drop, con frecce per il touch), colori, stile, font e caricamento immagini; cliccando un blocco nell'anteprima si apre il suo editor. Le modifiche si salvano da sole con debounce.
- **Rate limit**: contatori in Postgres (`rate_limits`), quindi validi anche con più istanze serverless. Limiti su login, registrazione, reset, caricamento immagini, chat (40/ora), contatti (10/ora per sito e IP).
- **Analytics**: una riga per visita e per clic (`site_views`, `site_events`), serie giornaliera a 30 giorni nella pagina statistiche.
- **Editor**: chat e pannello manuale modificano lo stesso JSON del sito. Il pannello permette testi, riordino dei blocchi (drag & drop o frecce), colori, stile/font e caricamento immediato delle immagini; cliccando un blocco nell'anteprima si apre il suo editor.
- **Consenso e termini**: il modulo contatti richiede l'informativa `/privacy`; la registrazione richiede l'accettazione dei `/termini` (data salvata su `users.terms_accepted_at`). Pagine legali: `/privacy`, `/termini`, `/cookie`; il footer pubblico mostra ragione sociale, P.IVA e sede se compilati.
- **Prezzi in sconto**: le schede prodotto accettano `compareAtPrice` e `lowestPrice30`; se c'è uno sconto la pagina mostra anche il prezzo minimo dei 30 giorni precedenti (direttiva Omnibus).
- **Sessioni**: firmate HMAC e versionate; cambiare password disconnette le sessioni esistenti.
- **Immagini**: senza `BLOB_READ_WRITE_TOKEN` finiscono in `public/uploads` (solo sviluppo locale). Su serverless non sono persistenti.
- **Errori**: gli errori non gestiti finiscono in `error_logs` tramite `instrumentation.ts`.
- **SEO**: `robots.txt`, `sitemap.xml` con tutte le landing pubbliche, immagine OpenGraph generata per ogni pagina; dashboard, editor e statistiche sono `noindex`.

## Deploy su Vercel

Imposta tutte le variabili in *Settings → Environment Variables*, esegui `scripts/schema.mjs` (o `migrate-v2.mjs`) sul database di produzione e pubblica. Senza `BLOB_READ_WRITE_TOKEN` gli upload rispondono 503 con messaggio esplicito.
