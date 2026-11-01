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

/**
 * Colore del testo sopra un riempimento pieno: bianco sui colori scuri, quasi
 * nero su quelli chiari. Senza questo, un accento giallo o azzurro produce
 * testo bianco illeggibile (segnalato da Lighthouse come contrasto).
 */
export function readableOn(hex: string): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0b0b0f" : "#ffffff";
}

function channels(hex: string): [number, number, number] | null {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function ratio(a: number, b: number): number {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

function blend(
  from: [number, number, number],
  to: [number, number, number],
  amount: number,
): [number, number, number] {
  return from.map((c, i) => Math.round(c + (to[i] - c) * amount)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * L'accento come testo sopra il proprio fondo tinto (badge, etichette): se il
 * colore scelto dall'utente non arriva a 4.5:1 viene schiarito (o scurito su
 * fondo chiaro) di quanto basta. Il colore resta riconoscibile, ma leggibile.
 */
export function legibleAccent(accent: string, background: string): string {
  const base = channels(accent);
  const bg = channels(background);
  if (!base || !bg) return accent;

  const tint = toHex(blend(bg, base, 0.16));
  const tintLum = relativeLuminance(channels(tint)!);
  const light = tintLum > 0.25;
  const towards: [number, number, number] = light ? [0, 0, 0] : [255, 255, 255];

  for (let step = 0; step <= 10; step += 1) {
    const candidate = toHex(blend(base, towards, step * 0.07));
    if (ratio(relativeLuminance(channels(candidate)!), tintLum) >= 4.5) return candidate;
  }
  return light ? "#0b0b0f" : "#ffffff";
}

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
