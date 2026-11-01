/**
 * Aggancio del dominio all'hosting.
 *
 * Verificare il DNS dimostra che il dominio è tuo, ma TLS e risposta HTTP
 * esistono solo se l'hosting conosce quell'hostname. Qui lo registriamo sul
 * progetto Vercel con la stessa API del pannello, in modo idempotente: se il
 * dominio è già presente non è un errore.
 */
export function hostingConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN && projectId());
}

function projectId(): string | undefined {
  return process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME;
}

export type AttachResult = {
  ok: boolean;
  /** Nessuna credenziale di hosting: verifica DNS valida, ma manca l'aggancio. */
  skipped?: boolean;
  attached: string[];
  error?: string;
};

export async function attachDomainsToHosting(domains: string[]): Promise<AttachResult> {
  const token = process.env.VERCEL_TOKEN;
  const project = projectId();
  if (!token || !project || !domains.length) return { ok: false, skipped: true, attached: [] };

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const attached: string[] = [];

  for (const domain of domains) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ name: domain }),
          signal: AbortSignal.timeout(8000),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string };
      };

      if (res.ok) {
        attached.push(domain);
        continue;
      }

      // Vercel risponde 409 sia per un dominio già su questo progetto sia per uno
      // su un altro: l'unico modo affidabile è chiedere l'elenco del progetto.
      if (res.status === 409 && (await domainIsOnProject(project, domain, headers))) {
        attached.push(domain);
        continue;
      }

      if (res.status === 409) {
        return {
          ok: false,
          attached,
          error: `${domain} è già collegato a un altro progetto di hosting`,
        };
      }

      return {
        ok: false,
        attached,
        error: data.error?.message ?? `Hosting ha risposto ${res.status}`,
      };
    } catch (error) {
      return { ok: false, attached, error: String(error).slice(0, 300) };
    }
  }

  return { ok: true, attached };
}

/** Il dominio è già registrato su questo progetto? */
async function domainIsOnProject(
  project: string,
  domain: string,
  headers: Record<string, string>,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(project)}/domains`,
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return false;
    const data = (await res.json().catch(() => ({}))) as {
      domains?: Array<{ name?: string }>;
    };
    return (data.domains ?? []).some((item) => item.name?.toLowerCase() === domain.toLowerCase());
  } catch {
    return false;
  }
}
