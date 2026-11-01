import { describe, expect, it } from "vitest";
import { colorDirective, explicitColors } from "@/lib/colors";

describe("explicitColors", () => {
  it("trova i colori nominati con l'esadecimale esatto", () => {
    expect(explicitColors("metti lo sfondo nero e il pulsante viola")).toEqual([
      { name: "nero", hex: "#000000" },
      { name: "viola", hex: "#8b5cf6" },
    ]);
  });

  it("non confonde parole che contengono il nome del colore", () => {
    expect(explicitColors("vendo rosari e rosetti")).toEqual([]);
  });

  it("ignora le maiuscole", () => {
    expect(explicitColors("VOGLIO TUTTO BIANCO").map((c) => c.name)).toEqual(["bianco"]);
  });
});

describe("colorDirective", () => {
  it("crea un'istruzione con i colori richiesti", () => {
    const directive = colorDirective("sfondo nero");
    expect(directive).toContain("nero = #000000");
    expect(directive).toContain("precedenza");
  });

  it("non aggiunge nulla se non ci sono colori", () => {
    expect(colorDirective("aggiungi un catalogo con tre prodotti")).toBeNull();
  });
});
