import { afterEach, describe, expect, it, vi } from "vitest";
import { siteUrl } from "@/lib/site-url";

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
