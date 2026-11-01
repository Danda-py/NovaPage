export const NAMED_COLORS: Record<string, string> = {
  nero: "#000000",
  bianco: "#ffffff",
  rosso: "#ef4444",
  blu: "#3b82f6",
  verde: "#22c55e",
  viola: "#8b5cf6",
  oro: "#d4af37",
  grigio: "#71717a",
  rosa: "#ec4899",
  arancione: "#f97316",
};

/** Colori nominati dall'utente nel messaggio, con il loro esadecimale esatto. */
export function explicitColors(message: string): Array<{ name: string; hex: string }> {
  const text = message.toLowerCase();
  const found: Array<{ name: string; hex: string }> = [];
  for (const [name, hex] of Object.entries(NAMED_COLORS)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) found.push({ name, hex });
  }
  return found;
}

/**
 * Istruzione da aggiungere alla richiesta: i colori chiesti a parole hanno la
 * precedenza sulla palette della direzione creativa scelta a caso.
 */
export function colorDirective(message: string): string | null {
  const colors = explicitColors(message);
  if (!colors.length) return null;
  return [
    "COLORI CHIESTI DALL'UTENTE (obbligatori, hanno precedenza sulla direzione creativa):",
    colors.map((c) => `${c.name} = ${c.hex}`).join(", "),
    "Chiama update_theme con questi valori esatti invece di inventare una palette.",
  ].join(" ");
}
