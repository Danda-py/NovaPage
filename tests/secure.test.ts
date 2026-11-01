import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/secure";

afterEach(() => {
  delete process.env.AUTH_SECRET;
});

describe("chiave Gemini cifrata", () => {
  it("fa il giro completo senza contenere il testo in chiaro", () => {
    process.env.AUTH_SECRET = "segreto-di-prova-0123456789";
    const key = "AIzaSyTESTKEY0123456789";
    const cipher = encryptSecret(key);
    expect(cipher).not.toContain(key);
    expect(cipher.split(".")).toHaveLength(3);
    expect(decryptSecret(cipher)).toBe(key);
  });

  it("non restituisce nulla se il testo è manomesso o assente", () => {
    process.env.AUTH_SECRET = "segreto-di-prova-0123456789";
    const parts = encryptSecret("AIzaSyTESTKEY0123456789").split(".");
    const tampered = [parts[0], parts[1], Buffer.from("altra chiave").toString("base64url")].join(".");
    expect(decryptSecret(tampered)).toBeNull();
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret("non-un-cifrato")).toBeNull();
  });
});
