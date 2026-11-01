import { afterEach, describe, expect, it } from "vitest";
import {
  aiConfigured,
  aiModel,
  aiProvider,
  aiTarget,
  generationConfig,
  isThinkingUnsupported,
  readUsage,
  vertexUrl,
} from "@/lib/ai";

const KEYS = [
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_MODEL_PAGE",
  "GEMINI_MODEL",
  "GEMINI_MODEL_PAGE",
  "AI_MAX_OUTPUT_TOKENS",
  "AI_THINKING_BUDGET",
  "GEMINI_API_KEY",
  "GOOGLE_VERTEX_API_KEY",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
];

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("aiProvider", () => {
  it("usa Gemini quando è configurata solo la chiave AI Studio", () => {
    process.env.GEMINI_API_KEY = "k";
    expect(aiProvider()).toBe("gemini");
  });

  it("sceglie Vertex quando ci sono credenziali Google Cloud", () => {
    process.env.GOOGLE_VERTEX_API_KEY = "k";
    expect(aiProvider()).toBe("vertex");
  });

  it("rispetta la scelta esplicita anche se ci sono entrambe", () => {
    process.env.GEMINI_API_KEY = "k";
    process.env.GOOGLE_VERTEX_API_KEY = "k";
    process.env.AI_PROVIDER = "gemini";
    expect(aiProvider()).toBe("gemini");
  });
});

describe("chiave personale dell'utente", () => {
  it("vince sul provider configurato e finisce nell'header della richiesta", async () => {
    process.env.GOOGLE_VERTEX_API_KEY = "vertex";
    const target = await aiTarget("edit", { apiKey: "chiave-utente" });
    expect(target.provider).toBe("gemini");
    expect(target.headers["x-goog-api-key"]).toBe("chiave-utente");
    expect(target.url).toContain(`models/${aiModel("edit")}:generateContent`);
  });

  it("basta la chiave dell'utente per avere l'assistente configurato", () => {
    expect(aiConfigured("chiave-utente")).toBe(true);
    expect(aiConfigured("   ")).toBe(false);
    expect(aiConfigured(null)).toBe(false);
  });
});

describe("aiModel", () => {
  it("usa il lite di default e il modello dedicato per le pagine nuove", () => {
    expect(aiModel("edit")).toBe("gemini-3.5-flash-lite");
    process.env.AI_MODEL_PAGE = "gemini-3.5-pro";
    expect(aiModel("page")).toBe("gemini-3.5-pro");
    expect(aiModel("edit")).toBe("gemini-3.5-flash-lite");
  });

  it("accetta la vecchia variabile GEMINI_MODEL", () => {
    process.env.GEMINI_MODEL = "gemini-x";
    expect(aiModel("edit")).toBe("gemini-x");
  });
});

describe("vertexUrl", () => {
  it("in express mode usa l'host globale senza progetto", () => {
    expect(vertexUrl({ model: "m", express: true })).toBe(
      "https://aiplatform.googleapis.com/v1/publishers/google/models/m:generateContent",
    );
  });

  it("con un progetto compone l'endpoint regionalizzato", () => {
    expect(vertexUrl({ model: "m", project: "p", location: "europe-west4", express: false })).toBe(
      "https://europe-west4-aiplatform.googleapis.com/v1/projects/p/locations/europe-west4/publishers/google/models/m:generateContent",
    );
  });

  it("tratta global come host senza prefisso", () => {
    expect(vertexUrl({ model: "m", project: "p", location: "global", express: false })).toContain(
      "https://aiplatform.googleapis.com/v1/projects/p/locations/global/",
    );
  });
});

describe("generationConfig", () => {
  it("non invia thinkingConfig se non richiesto e limita l'output", () => {
    const config = generationConfig("edit") as {
      maxOutputTokens: number;
      thinkingConfig?: { thinkingBudget: number };
    };
    expect(config.thinkingConfig).toBeUndefined();
    expect(config.maxOutputTokens).toBe(4096);
  });

  it("lascia spazio alle pagine nuove e accetta override", () => {
    process.env.AI_MAX_OUTPUT_TOKENS = "8000";
    expect((generationConfig("page") as { maxOutputTokens: number }).maxOutputTokens).toBe(8000);
    process.env.AI_THINKING_BUDGET = "128";
    expect(
      (generationConfig("page") as { thinkingConfig: { thinkingBudget: number } }).thinkingConfig
        .thinkingBudget,
    ).toBe(128);
  });
});

describe("isThinkingUnsupported", () => {
  it("riconosce il rifiuto del thinkingConfig", () => {
    expect(isThinkingUnsupported(400, '{"error":"thinkingConfig is not supported"}')).toBe(true);
    expect(isThinkingUnsupported(400, "invalid argument: model")).toBe(false);
    expect(isThinkingUnsupported(429, "thinking quota")).toBe(false);
  });
});

describe("readUsage", () => {
  it("legge i token dichiarati da usageMetadata", () => {
    expect(
      readUsage({
        usageMetadata: {
          promptTokenCount: 1200,
          candidatesTokenCount: 800,
          cachedContentTokenCount: 300,
          totalTokenCount: 2000,
        },
      }),
    ).toEqual({ prompt: 1200, output: 800, cached: 300, total: 2000 });
  });

  it("restituisce zeri senza metadati", () => {
    expect(readUsage({})).toEqual({ prompt: 0, output: 0, cached: 0, total: 0 });
  });
});
