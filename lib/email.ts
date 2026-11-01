import "server-only";
import { logError } from "./store";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
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
