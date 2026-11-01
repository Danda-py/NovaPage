import "server-only";
import { logError } from "./store";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Resend consegna solo all'indirizzo del titolare finché il mittente è quello di
 * prova (`@resend.dev`). Distinguere la modalità permette all'interfaccia di dire
 * la verità invece di mostrare "email inviata" quando non parte nulla.
 */
export type EmailMode = "missing" | "test" | "ready";

export function emailMode(): EmailMode {
  const from = process.env.EMAIL_FROM ?? "";
  if (!process.env.RESEND_API_KEY || !from) return "missing";
  const host = from.match(/@([^>\s]+)/)?.[1]?.toLowerCase() ?? "";
  return host === "resend.dev" || host.endsWith(".resend.dev") ? "test" : "ready";
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Risposta del titolare: i messaggi del destinatario tornano a lui. */
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : null),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      await logError({ source: "email", message: `Resend ${res.status}`, detail: detail.slice(0, 500) });
      return false;
    }
    return true;
  } catch (error) {
    await logError({ source: "email", message: "Invio email fallito", detail: String(error) });
    return false;
  }
}

/**
 * Avviso agli amministratori quando un errore finisce in `error_logs`.
 * Throttle in memoria per istanza: in caso di raffica di errori non vogliamo
 * cento email, e perderne qualcuna è accettabile per un alert.
 */
const lastAlert = new Map<string, number>();

export async function notifyAdmin(input: { source: string; message: string }): Promise<boolean> {
  const to = process.env.ADMIN_EMAIL;
  if (!to || !emailConfigured()) return false;

  const now = Date.now();
  if ((lastAlert.get(input.source) ?? 0) > now - 10 * 60 * 1000) return false;
  lastAlert.set(input.source, now);

  return sendEmail({
    to,
    subject: `[NovaPage] errore in ${input.source}`,
    html: securityEmailHtml({ title: `Errore in ${input.source}`, body: input.message }),
    text: `Errore in ${input.source}: ${input.message}`,
  });
}

export function resetEmailHtml(link: string): string {
  return `<div style="font-family:system-ui,sans-serif;background:#09090b;color:#f4f4f5;padding:32px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8b5cf6;margin:0 0 16px">NovaPage</p>
  <h1 style="font-size:22px;margin:0 0 12px">Reimposta la password</h1>
  <p style="font-size:14px;line-height:1.6;color:#a1a1aa;margin:0 0 24px">
    Il link scade tra un'ora e può essere usato una sola volta. Se non hai richiesto il cambio, ignora questa email.
  </p>
  <a href="${link}" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600">
    Scegli una nuova password
  </a>
  <p style="font-size:12px;color:#52525b;margin:24px 0 0">${link}</p>
</div>`;
}

/**
 * Avviso di sicurezza: password o email cambiate. Se non sei stato tu, l'utente
 * deve poterlo capire subito da un messaggio che non dipende dal sito.
 */
export function securityEmailHtml(input: { title: string; body: string }): string {
  return `<div style="font-family:system-ui,sans-serif;background:#09090b;color:#f4f4f5;padding:32px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8b5cf6;margin:0 0 16px">NovaPage</p>
  <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(input.title)}</h1>
  <p style="font-size:14px;line-height:1.6;color:#a1a1aa;margin:0 0 16px">${escapeHtml(input.body)}</p>
  <p style="font-size:12px;line-height:1.6;color:#52525b;margin:0">Se non sei stato tu, rispondi a questa email o reimposta subito la password dalla pagina di accesso.</p>
</div>`;
}

/** I dati dei visitatori finiscono in una email: vanno sempre neutralizzati. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Conferma al visitatore che ha compilato il modulo: chiude il cerchio e riduce i doppioni. */
export function leadThankYouHtml(input: { title: string; url: string; name: string }): string {
  const hello = input.name ? `Ciao ${escapeHtml(input.name)},` : "Ciao,";
  return `<div style="font-family:system-ui,sans-serif;background:#09090b;color:#f4f4f5;padding:32px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8b5cf6;margin:0 0 16px">NovaPage</p>
  <h1 style="font-size:20px;margin:0 0 12px">Messaggio ricevuto</h1>
  <p style="font-size:14px;line-height:1.6;color:#a1a1aa;margin:0 0 16px">${hello} la tua richiesta è arrivata a ${escapeHtml(input.title)}. Ti risponderemo ai recapiti che hai indicato.</p>
  <p style="font-size:12px;line-height:1.6;color:#52525b;margin:0">Hai ricevuto questa email perché hai compilato il modulo su <a href="${escapeHtml(input.url)}" style="color:#8b5cf6">${escapeHtml(input.url)}</a>. Se non sei stato tu, ignora il messaggio.</p>
</div>`;
}

/** Risposta del titolare a chi ha compilato il modulo: testo semplice, nessun tracciamento. */
export function leadReplyHtml(input: { title: string; body: string; siteEmail: string }): string {
  return `<div style="font-family:system-ui,sans-serif;background:#09090b;color:#f4f4f5;padding:32px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8b5cf6;margin:0 0 16px">${escapeHtml(input.title)}</p>
  <div style="font-size:14px;line-height:1.7;color:#d4d4d8;white-space:pre-wrap">${escapeHtml(input.body)}</div>
  <p style="font-size:12px;color:#52525b;margin:24px 0 0">Rispondi pure a questa email: arriva a ${escapeHtml(input.siteEmail)}.</p>
</div>`;
}

/** Email al titolare della pagina quando il modulo contatti riceve un messaggio. */
export function leadNotificationHtml(input: {
  title: string;
  url: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  at: string;
}): string {
  const rows = [
    ["Nome", input.name || "—"],
    ["Email", input.email || "—"],
    ["Telefono", input.phone || "—"],
    ["Ricevuto", input.at],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;font-size:12px;color:#71717a;width:90px">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#e4e4e7">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<div style="font-family:system-ui,sans-serif;background:#09090b;color:#f4f4f5;padding:32px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8b5cf6;margin:0 0 16px">NovaPage</p>
  <h1 style="font-size:20px;margin:0 0 12px">Nuovo contatto da ${escapeHtml(input.title)}</h1>
  <table style="width:100%;border-collapse:collapse;margin:0 0 16px">${rows}</table>
  <div style="border-top:1px solid #27272a;padding-top:12px;font-size:14px;line-height:1.6;color:#a1a1aa;white-space:pre-wrap">${escapeHtml(input.message || "(nessun messaggio)")}</div>
  <a href="${escapeHtml(input.url)}" style="display:inline-block;margin-top:24px;background:#8b5cf6;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:600">Apri i contatti</a>
</div>`;
}
