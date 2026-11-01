/**
 * Controllo dei contenuti pericolosi nelle landing generate.
 *
 * I Termini vietano phishing e raccolta di credenziali, ma senza un controllo
 * automatico la regola resta solo scritta. Qui riconosciamo i segnali minimi e
 * oggettivi: campi password, dati di carta, form che inviano a un server
 * esterno. Non è un antivirus, è la soglia sotto la quale una pagina non va
 * pubblicata a nome della piattaforma.
 */
const RULES: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /<input\b[^>]*type\s*=\s*["']?password/i,
    message:
      "La pagina contiene un campo password: NovaPage non ospita moduli di accesso o raccolta credenziali.",
  },
  {
    pattern: /<input\b[^>]*name\s*=\s*["']?(password|cvv|cvc|cardnumber|card-number|cc-number|iban)/i,
    message: "La pagina raccoglie dati di pagamento o credenziali, non consentito dai Termini di servizio.",
  },
  {
    pattern: /autocomplete\s*=\s*["']?cc-(number|name|cvc|exp)/i,
    message: "La pagina raccoglie dati di carta di credito: usa un link al tuo sistema di pagamento.",
  },
  {
    pattern: /<form\b[^>]*action\s*=\s*["']?(https?:)?\/\//i,
    message:
      "Il modulo invia i dati a un sito esterno: usa il blocco contatti di NovaPage, che salva i lead nel tuo account.",
  },
];

export function riskyMarkup(html: string): string | null {
  if (!html) return null;
  for (const rule of RULES) {
    if (rule.pattern.test(html)) return rule.message;
  }
  return null;
}
