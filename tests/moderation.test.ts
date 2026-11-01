import { describe, expect, it } from "vitest";
import { riskyMarkup } from "@/lib/moderation";

describe("riskyMarkup", () => {
  it("blocca i campi password", () => {
    expect(riskyMarkup('<form><input type="password" name="pw"></form>')).toMatch(/password/i);
  });

  it("blocca i dati di carta", () => {
    expect(riskyMarkup('<input name="cardnumber">')).toMatch(/pagamento|credenziali/i);
    expect(riskyMarkup('<input autocomplete="cc-number">')).toMatch(/carta/i);
  });

  it("blocca i moduli che inviano dati fuori", () => {
    expect(riskyMarkup('<form action="https://evil.example.com/collect">')).toMatch(/esterno/i);
    expect(riskyMarkup('<form action="//evil.example.com">')).toMatch(/esterno/i);
  });

  it("lascia passare le pagine normali", () => {
    expect(riskyMarkup('<form data-novapage-lead action="/api/leads/form"><input name="email"></form>')).toBeNull();
    expect(riskyMarkup("<h1>Casa Aurora</h1><p>Wi-Fi: ospiti2026</p>")).toBeNull();
    expect(riskyMarkup("")).toBeNull();
  });
});
