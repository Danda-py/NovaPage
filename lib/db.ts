import { neon } from "@neondatabase/serverless";

type Client = ReturnType<typeof neon>;
let client: Client | null = null;

/** Errori di rete verso il database: passano da soli, non sono bug della query. */
const TRANSIENT =
  /fetch failed|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|socket hang up/i;

export function isTransientError(error: unknown): boolean {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const candidate = current as { message?: string; code?: string; cause?: unknown };
    if (typeof candidate.message === "string") parts.push(candidate.message);
    if (typeof candidate.code === "string") parts.push(candidate.code);
    current = candidate.cause;
  }
  return TRANSIENT.test(parts.join(" "));
}

/**
 * Una caduta di rete di mezzo secondo non deve diventare una pagina di errore:
 * si ritenta un paio di volte prima di arrendersi.
 */
export async function withRetry<T>(run: () => Promise<T>, delays = [150, 450]): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt === delays.length || !isTransientError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
  throw lastError;
}

function wrap(sql: Client): Client {
  return new Proxy(sql, {
    apply(target, thisArg, args) {
      return withRetry(() => Reflect.apply(target, thisArg, args) as Promise<unknown>);
    },
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) =>
        withRetry(() => (value as (...a: unknown[]) => Promise<unknown>).apply(target, args));
    },
  }) as Client;
}

export function db(): Client {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL non configurata: aggiungila a .env.local");
  }
  client ??= wrap(neon(url));
  return client;
}
