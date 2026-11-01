/**
 * 404 per gli slug inesistenti.
 *
 * Il proxy è l'unico punto in cui lo stato HTTP è ancora decidibile (dentro la
 * pagina lo shell è già stato inviato). Da lì non possiamo renderizzare React,
 * quindi la pagina è un documento minimo, autocontenuto e senza richieste
 * esterne: costa pochi byte e risponde 404 vero a Google.
 */
export function notFoundHtml(): string {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>Pagina non trovata · NovaPage</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100dvh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
    background: #09090b; color: #f4f4f5; padding: 24px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .brand { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
  .mark { width: 20px; height: 20px; border-radius: 9999px; border: 1px solid rgba(139,92,246,.35); position: relative; }
  .mark::after { content: ""; position: absolute; inset: 5px; border-radius: 2px; transform: rotate(45deg); background: #8b5cf6; }
  .code { margin-top: 28px; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: #71717a; }
  h1 { margin: 12px 0 0; font-size: 28px; line-height: 1.15; letter-spacing: -.02em; }
  p { margin: 12px 0 0; max-width: 22rem; font-size: 14px; line-height: 1.6; color: #a1a1aa; }
  a { margin-top: 32px; display: inline-block; padding: 12px 20px; border-radius: 12px;
      background: #7c3aed; color: #fff; text-decoration: none; font-size: 14px; font-weight: 500; }
  a:hover { background: #8b5cf6; }
</style>
</head>
<body>
  <div class="brand"><span class="mark"></span>NovaPage</div>
  <p class="code">Errore 404</p>
  <h1>Questa pagina non esiste</h1>
  <p>Il link potrebbe essere stato rimosso, rinominato o non è mai esistito.</p>
  <a href="/">Torna alla home</a>
</body>
</html>`;
}
