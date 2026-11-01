import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOrigin, siteUrl } from "@/lib/site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("usa NEXT_PUBLIC_SITE_URL togliendo lo slash finale", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://novapage.site/");
    expect(siteUrl()).toBe("https://novapage.site");
  });

  it("usa il dominio di produzione Vercel quando manca l'URL esplicito", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "novapage.vercel.app");
    expect(siteUrl()).toBe("https://novapage.vercel.app");
  });

  it("ripiega su localhost in sviluppo", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});

describe("requestOrigin", () => {
  it("preferisce l'header Origin", () => {
    const req = new Request("http://localhost/api/auth/forgot", {
      headers: { origin: "https://aurora.it/" },
    });
    expect(requestOrigin(req)).toBe("https://aurora.it");
  });

  it("ricostruisce l'origine dagli header del proxy", () => {
    const req = new Request("http://localhost/api/auth/forgot", {
      headers: { "x-forwarded-host": "novapage.site", "x-forwarded-proto": "https" },
    });
    expect(requestOrigin(req)).toBe("https://novapage.site");
  });
});
