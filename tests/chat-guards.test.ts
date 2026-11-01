import { describe, expect, it } from "vitest";
import { claimsChange, NO_CHANGE_REPLY } from "@/lib/chat-guards";

describe("claimsChange", () => {
  it("riconosce le conferme di modifica", () => {
    expect(claimsChange("Fatto, ho aggiornato la pagina.")).toBe(true);
    expect(claimsChange("Ho aggiunto il banner in cima")).toBe(true);
    expect(claimsChange("Ho eliminato il catalogo")).toBe(true);
    expect(claimsChange("Pagina pronta")).toBe(true);
  });

  it("non tratta come conferma una risposta che nega la modifica", () => {
    expect(claimsChange("Non serve alcuna modifica")).toBe(false);
    expect(claimsChange("La pagina era già così")).toBe(false);
    expect(claimsChange("Cosa vuoi cambiare?")).toBe(false);
  });

  it("la risposta di fallback è già una negazione", () => {
    expect(NO_CHANGE_REPLY.startsWith("Non ho modificato nulla")).toBe(true);
  });
});
