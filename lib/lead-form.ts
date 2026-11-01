/** Validazione e memoria dei valori del modulo contatti delle pagine HTML. */

export type LeadField = "name" | "email" | "phone" | "message";
export type LeadFieldValues = Partial<Record<LeadField, string>>;

export type LeadState = "inviato" | "consenso" | "recapiti" | "email" | "limite" | "errore";

export type LeadSubmission = {
  ok: boolean;
  state: LeadState;
  values: LeadFieldValues;
  email: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Campi e limiti, in un posto solo: li usano la route e il test. */
export function parseLeadSubmission(get: (key: string) => string): LeadSubmission {
  const values: LeadFieldValues = {
    name: get("name").slice(0, 80),
    email: get("email").slice(0, 120),
    phone: get("phone").slice(0, 40),
    message: get("message").slice(0, 1000),
  };
  const consent = ["on", "true", "1", "si", "sì"].includes(get("consent").toLowerCase());

  if (!consent) return { ok: false, state: "consenso", values, email: values.email ?? "" };
  if (!values.name && !values.email && !values.phone) {
    return { ok: false, state: "recapiti", values, email: values.email ?? "" };
  }
  if (values.email && !EMAIL.test(values.email)) {
    return { ok: false, state: "email", values, email: values.email };
  }
  return { ok: true, state: "inviato", values, email: values.email ?? "" };
}

export const LEAD_COOKIE = "np_lead";

/**
 * I valori compilati restano in un cookie httpOnly per dieci minuti: se il
 * modulo torna indietro per un errore, il visitatore non riscrive tutto.
 */
export function encodeLeadCookie(values: LeadFieldValues): string {
  const json = JSON.stringify({ n: values.name ?? "", e: values.email ?? "", p: values.phone ?? "", m: values.message ?? "" });
  return encodeURIComponent(json).slice(0, 1800);
}

export function decodeLeadCookie(raw: string | undefined): LeadFieldValues | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const values: LeadFieldValues = {};
    if (typeof parsed.n === "string" && parsed.n) values.name = parsed.n.slice(0, 80);
    if (typeof parsed.e === "string" && parsed.e) values.email = parsed.e.slice(0, 120);
    if (typeof parsed.p === "string" && parsed.p) values.phone = parsed.p.slice(0, 40);
    if (typeof parsed.m === "string" && parsed.m) values.message = parsed.m.slice(0, 1000);
    return Object.keys(values).length ? values : null;
  } catch {
    return null;
  }
}
