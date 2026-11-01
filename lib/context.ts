import type { ChatMessage } from "./store";

const RECENT_FULL = 8;
const RECAP_ITEMS = 30;
const RECAP_CHARS = 110;
const RECENT_CHARS = 700;

/**
 * Costruisce il contesto da inviare al modello senza perdere la chat visibile:
 * gli ultimi messaggi restano integrali, i più vecchi vengono compressi in un riassunto.
 */
/**
 * Per le correzioni mirate bastano gli ultimi scambi: mandare tutta la
 * cronologia costa token a ogni richiesta senza cambiare il risultato.
 */
export function buildConversationContext(
  chat: ChatMessage[],
  options: { recent?: number; recap?: number } = {},
): string {
  if (!chat.length) return "";

  const recentCount = Math.max(1, options.recent ?? RECENT_FULL);
  const recapCount = Math.max(0, options.recap ?? RECAP_ITEMS);

  const recent = chat.slice(-recentCount);
  const older = chat.slice(0, Math.max(0, chat.length - recentCount));

  const recap: string[] = [];
  const kept = recapCount > 0 ? older.slice(-recapCount) : [];
  if (older.length > recapCount) {
    recap.push(`(${older.length - recapCount} messaggi più vecchi omessi)`);
  }
  for (const m of kept) {
    const who = m.role === "user" ? "Utente" : "Nova";
    const text = m.text.replace(/\s+/g, " ").trim();
    const photos = m.images?.length ? ` [${m.images.length} foto]` : "";
    const answers = m.answers ? ` [dati compilati: ${Object.keys(m.answers).join(", ")}]` : "";
    const short = text.length > RECAP_CHARS ? `${text.slice(0, RECAP_CHARS)}…` : text;
    recap.push(`- ${who}: ${short}${photos}${answers}`);
  }

  const recentText = recent
    .map((m) => {
      const who = m.role === "user" ? "UTENTE" : "NOVA";
      const photos = m.images?.length ? `\n  foto: ${m.images.join(", ")}` : "";
      const short = m.text.length > RECENT_CHARS ? `${m.text.slice(0, RECENT_CHARS)}…` : m.text;
      return `${who}: ${short}${photos}`;
    })
    .join("\n");

  return [
    recap.length ? `RIASSUNTO DEI MESSAGGI PRECEDENTI:\n${recap.join("\n")}` : "",
    `MESSAGGI RECENTI:\n${recentText}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
