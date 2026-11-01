import { hitRateLimit } from "./store";

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  return hitRateLimit(key, limit, windowMs);
}

/** IP del client dietro proxy Vercel/Cloudflare. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 60);
  return req.headers.get("x-real-ip")?.slice(0, 60) ?? "local";
}

export function tooMany(retryAfter: number) {
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return `Troppi tentativi. Riprova tra ${minutes} ${minutes === 1 ? "minuto" : "minuti"}.`;
}
