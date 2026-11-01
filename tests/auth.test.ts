import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashPassword,
  readSessionToken,
  verifyPassword,
} from "@/lib/auth";

const SECRET = "test-secret";

function signPayload(payload: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

beforeAll(() => {
  process.env.AUTH_SECRET = SECRET;
});

describe("sessioni", () => {
  it("crea e rilegge un token valido", () => {
    const token = createSessionToken("user_123", 3);
    expect(readSessionToken(token)).toEqual({ userId: "user_123", sessionVersion: 3 });
  });

  it("usa 0 come versione predefinita", () => {
    expect(readSessionToken(createSessionToken("user_abc"))).toEqual({
      userId: "user_abc",
      sessionVersion: 0,
    });
  });

  it("rifiuta un token manomesso", () => {
    const token = createSessionToken("user_123", 0);
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    expect(readSessionToken(tampered)).toBeNull();
  });

  it("rifiuta un token firmato con un altro segreto", () => {
    const payload = `user_123.${Date.now() + 60_000}.0`;
    expect(readSessionToken(`${payload}.${signPayload(payload, "altro-segreto")}`)).toBeNull();
  });

  it("rifiuta un token scaduto", () => {
    const payload = `user_123.${Date.now() - 1_000}.0`;
    expect(readSessionToken(`${payload}.${signPayload(payload)}`)).toBeNull();
  });

  it("rifiuta token malformati o assenti", () => {
    expect(readSessionToken(undefined)).toBeNull();
    expect(readSessionToken("")).toBeNull();
    expect(readSessionToken("solo.user")).toBeNull();
    expect(readSessionToken("a.b.c.d.e")).toBeNull();
  });
});

describe("password", () => {
  it("verifica la password corretta e rifiuta quella sbagliata", async () => {
    const { salt, hash } = await hashPassword("password-robusta");
    expect(await verifyPassword("password-robusta", salt, hash)).toBe(true);
    expect(await verifyPassword("password-sbagliata", salt, hash)).toBe(false);
  });

  it("genera hash diversi per password uguali", async () => {
    const [a, b] = await Promise.all([hashPassword("stessa-password"), hashPassword("stessa-password")]);
    expect(a.hash).not.toBe(b.hash);
  });
});
