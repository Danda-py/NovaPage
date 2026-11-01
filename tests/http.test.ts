import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson, safeFetch } from "@/lib/http";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safeFetch", () => {
  it("restituisce null quando la rete cade, invece di lanciare", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(safeFetch("/api/x")).resolves.toBeNull();
  });

  it("restituisce la Response quando la richiesta passa", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok", { status: 201 })));
    const res = await safeFetch("/api/x");
    expect(res?.status).toBe(201);
  });
});

describe("requestJson", () => {
  it("espone status e corpo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ error: "no" }, { status: 422 })),
    );
    const result = await requestJson<{ error: string }>("/api/x");
    expect(result).toEqual({ ok: false, status: 422, data: { error: "no" } });
  });

  it("con la rete a terra restituisce ok:false e status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await requestJson("/api/x");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
  });
});
