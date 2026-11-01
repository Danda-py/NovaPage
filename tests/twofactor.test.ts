import { describe, expect, it } from "vitest";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "@/lib/twofactor";

// RFC 6238, SHA-1, segreto ASCII "12345678901234567890": a 59 s il codice a 6
// cifre è 287082. È il vettore che verifica contatore, troncamento e finestra.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("TOTP", () => {
  it("accetta il codice del vettore RFC alla stessa epoca", () => {
    expect(verifyTotp(RFC_SECRET, "287082", 59_000)).toBe(true);
  });

  it("tollera uno scarto di un passo ma non oltre", () => {
    expect(verifyTotp(RFC_SECRET, "287082", 59_000 + 30_000)).toBe(true);
    expect(verifyTotp(RFC_SECRET, "287082", 59_000 + 120_000)).toBe(false);
  });

  it("rifiuta codici malformati o sbagliati", () => {
    expect(verifyTotp(RFC_SECRET, "28708")).toBe(false);
    expect(verifyTotp(RFC_SECRET, "28708a")).toBe(false);
    expect(verifyTotp(RFC_SECRET, "", 59_000)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "000000", 59_000)).toBe(false);
  });

  it("genera segreti base32 distinti e utilizzabili", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateTotpSecret()).not.toBe(secret);
  });

  it("costruisce l'URI che le app di autenticazione leggono", () => {
    const uri = otpauthUri("tizio@example.com", RFC_SECRET);
    expect(uri.startsWith("otpauth://totp/NovaPage:")).toBe(true);
    expect(uri).toContain(`secret=${RFC_SECRET}`);
    expect(uri).toContain("issuer=NovaPage");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

describe("codici di recupero", () => {
  it("hanno formato leggibile e non si ripetono", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    for (const code of codes) expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("normalizzano maiuscole, spazi e trattini prima dell'hash", () => {
    const hash = hashRecoveryCode("AB2C-DE3F");
    expect(hashRecoveryCode("ab2c de3f")).toBe(hash);
    expect(hashRecoveryCode(" AB2CDE3F ")).toBe(hash);
    expect(hashRecoveryCode("ZZZZ-ZZZZ")).not.toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
