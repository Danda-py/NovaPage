import { createSign } from "node:crypto";

export type AiProviderId = "gemini" | "vertex";
export type AiIntent = "page" | "edit";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** "vertex" esplicito, oppure dedotto: se ci sono credenziali Vertex si usa Vertex. */
export function aiProvider(): AiProviderId {
  const explicit = env("AI_PROVIDER").toLowerCase();
  if (explicit === "vertex" || explicit === "gemini") return explicit;
  if (env("GOOGLE_VERTEX_API_KEY") || env("GOOGLE_SERVICE_ACCOUNT_JSON")) return "vertex";
  return "gemini";
}

/**
 * Modello per tipo di lavoro: le pagine nuove giustificano un modello più capace,
 * le correzioni piccole vanno su quello economico.
 */
export function aiModel(intent: AiIntent = "edit"): string {
  const base = env("AI_MODEL") || env("GEMINI_MODEL") || DEFAULT_MODEL;
  if (intent === "page") {
    return env("AI_MODEL_PAGE") || env("GEMINI_MODEL_PAGE") || base;
  }
  return base;
}

export function aiConfigured(userKey?: string | null): boolean {
  // La chiave personale dell'utente vale quanto quella dell'installazione, e
  // aiTarget la preferisce comunque: qualunque provider sia configurato.
  if (userKey?.trim()) return true;
  if (aiProvider() === "vertex") {
    return Boolean(env("GOOGLE_VERTEX_API_KEY") || serviceAccount());
  }
  return Boolean(env("GEMINI_API_KEY"));
}

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
};

export function serviceAccount(): ServiceAccount | null {
  const raw = env("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as ServiceAccount;
    return parsed.client_email && parsed.private_key ? parsed : null;
  } catch {
    return null;
  }
}

/** Endpoint Gemini di Vertex: express mode usa l'host globale senza progetto. */
export function vertexUrl(input: {
  model: string;
  project?: string;
  location?: string;
  express: boolean;
}): string {
  if (input.express) {
    return `https://aiplatform.googleapis.com/v1/publishers/google/models/${input.model}:generateContent`;
  }
  const location = (input.location || "global").trim();
  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${input.project}/locations/${location}/publishers/google/models/${input.model}:generateContent`;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

/** JWT firmato con la chiave del service account, scambiato con un access token. */
async function accessToken(account: ServiceAccount): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const audience = account.token_uri || "https://oauth2.googleapis.com/token";
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: audience,
      iat: issuedAt,
      exp: issuedAt + 3500,
    }),
  ).toString("base64url");

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(account.private_key).toString("base64url");
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch(audience, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Vertex auth ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Vertex auth: access_token mancante");
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

export type AiTarget = {
  provider: AiProviderId;
  label: string;
  model: string;
  url: string;
  headers: Record<string, string>;
};

/** Dove mandare la richiesta: AI Studio oppure Vertex (API key o service account). */
export async function aiTarget(
  intent: AiIntent = "edit",
  options: { apiKey?: string | null } = {},
): Promise<AiTarget> {
  const model = aiModel(intent);
  const userKey = options.apiKey?.trim();

  // Chiave dell'utente: AI Studio, indipendentemente da come è configurata
  // l'installazione. Il modello resta quello scelto dalla piattaforma.
  if (userKey) {
    return {
      provider: "gemini",
      label: "Gemini (tua chiave)",
      model,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      headers: { "Content-Type": "application/json", "x-goog-api-key": userKey },
    };
  }

  if (aiProvider() === "vertex") {
    const apiKey = env("GOOGLE_VERTEX_API_KEY");
    if (apiKey) {
      return {
        provider: "vertex",
        label: "Vertex AI",
        model,
        url: vertexUrl({ model, express: true }),
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      };
    }

    const account = serviceAccount();
    if (!account) {
      throw new Error(
        "Vertex AI non configurato: imposta GOOGLE_VERTEX_API_KEY (express mode) oppure GOOGLE_SERVICE_ACCOUNT_JSON con GOOGLE_VERTEX_PROJECT.",
      );
    }
    const project = env("GOOGLE_VERTEX_PROJECT") || account.project_id;
    if (!project) throw new Error("GOOGLE_VERTEX_PROJECT mancante per Vertex AI.");

    return {
      provider: "vertex",
      label: "Vertex AI",
      model,
      url: vertexUrl({
        model,
        project,
        location: env("GOOGLE_VERTEX_LOCATION") || "global",
        express: false,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await accessToken(account)}`,
      },
    };
  }

  const key = env("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY non configurata");
  return {
    provider: "gemini",
    label: "Gemini",
    model,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
  };
}

/**
 * Il ragionamento dei modelli ibridi si paga come output: per generare landing
 * non serve. thinkingConfig però non è accettato da tutti i modelli, quindi si
 * invia solo se AI_THINKING_BUDGET è impostata (es. 0 per spegnerlo dove è
 * supportato).
 */
export function generationConfig(intent: AiIntent = "edit"): Record<string, unknown> {
  const budget = env("AI_THINKING_BUDGET");
  const explicitMax = Number(env("AI_MAX_OUTPUT_TOKENS"));
  const maxOutputTokens =
    Number.isFinite(explicitMax) && explicitMax > 0 ? explicitMax : intent === "page" ? 32000 : 4096;

  const config: Record<string, unknown> = {
    maxOutputTokens,
    temperature: intent === "page" ? 0.9 : 0.6,
  };
  if (budget !== "" && Number.isFinite(Number(budget))) {
    config.thinkingConfig = { thinkingBudget: Number(budget) };
  }
  return config;
}

/** Alcuni modelli non accettano thinkingConfig: in quel caso si riprova senza. */
export function isThinkingUnsupported(status: number, detail: string): boolean {
  return status === 400 && /thinking/i.test(detail);
}

export type AiUsage = { prompt: number; output: number; cached: number; total: number };

/** I token dell'ultima risposta, letti da usageMetadata del formato Gemini. */
export function readUsage(data: unknown): AiUsage {
  const usage = ((data as { usageMetadata?: Record<string, number> } | null)?.usageMetadata ?? {}) as Record<
    string,
    number
  >;
  const prompt = Number(usage.promptTokenCount ?? 0);
  const output = Number(usage.candidatesTokenCount ?? 0);
  const cached = Number(usage.cachedContentTokenCount ?? 0);
  const total = Number(usage.totalTokenCount ?? prompt + output);
  return { prompt, output, cached, total };
}
