/**
 * I piani in un posto solo: li leggono il server (limiti reali) e l'interfaccia
 * (cosa mostrare). La monetizzazione non è ancora attiva, quindi il piano si
 * assegna a mano nel database (`update users set plan = 'pro' where email = …`),
 * ma i limiti sono già applicati e non aggirabili dal client.
 */
export type Plan = "free" | "pro";

export type PlanSpec = {
  label: string;
  /** Numero massimo di landing pubblicabili. */
  sites: number;
  /** Rimozione del badge "Creato con NovaPage". */
  hideBadge: boolean;
};

export const PLANS: Record<Plan, PlanSpec> = {
  free: { label: "Gratuito", sites: 1, hideBadge: false },
  pro: { label: "Pro", sites: Number.POSITIVE_INFINITY, hideBadge: true },
};

export function planOf(value: unknown): Plan {
  return value === "pro" ? "pro" : "free";
}

export function planSpec(value: unknown): PlanSpec {
  return PLANS[planOf(value)];
}

export function siteLimitReached(plan: Plan, sites: number): boolean {
  return sites >= PLANS[plan].sites;
}
