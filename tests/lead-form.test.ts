import { describe, expect, it } from "vitest";
import { decodeLeadCookie, encodeLeadCookie, parseLeadSubmission } from "@/lib/lead-form";

function form(values: Record<string, string>) {
  return (key: string) => values[key] ?? "";
}

describe("parseLeadSubmission", () => {
  it("accetta un invio valido", () => {
    const result = parseLeadSubmission(
      form({ consent: "on", name: "Anna", email: "anna@example.com", message: "Ciao" }),
    );
    expect(result.ok).toBe(true);
    expect(result.state).toBe("inviato");
    expect(result.values.name).toBe("Anna");
  });

  it("rifiuta senza consenso", () => {
    const result = parseLeadSubmission(form({ email: "anna@example.com" }));
    expect(result.ok).toBe(false);
    expect(result.state).toBe("consenso");
  });

  it("rifiuta senza recapiti", () => {
    const result = parseLeadSubmission(form({ consent: "on", message: "Solo testo" }));
    expect(result.state).toBe("recapiti");
  });

  it("rifiuta un'email non valida e restituisce i valori", () => {
    const result = parseLeadSubmission(form({ consent: "on", email: "anna@", name: "Anna" }));
    expect(result.state).toBe("email");
    expect(result.values.email).toBe("anna@");
    expect(result.values.name).toBe("Anna");
  });

  it("accetta solo il telefono", () => {
    const result = parseLeadSubmission(form({ consent: "sì", phone: "+39 333 1234567" }));
    expect(result.ok).toBe(true);
  });

  it("taglia i campi fuori misura", () => {
    const result = parseLeadSubmission(form({ consent: "on", name: "a".repeat(500) }));
    expect(result.values.name?.length).toBe(80);
  });
});

describe("cookie dei valori compilati", () => {
  it("fa il giro completo", () => {
    const values = { name: "Anna", email: "anna@example.com", message: "Vorrei un preventivo" };
    expect(decodeLeadCookie(encodeLeadCookie(values))).toEqual(values);
  });

  it("ignora un cookie rotto", () => {
    expect(decodeLeadCookie("%non-json")).toBeNull();
    expect(decodeLeadCookie(undefined)).toBeNull();
  });
});
