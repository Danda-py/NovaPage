import { describe, expect, it } from "vitest";
import { applyToolCalls, INITIAL_SITE, type Site } from "@/lib/site";

function withLinks(buttons: Array<Record<string, unknown>>) {
  const site: Site = applyToolCalls(structuredClone(INITIAL_SITE), [
    { name: "add_block", args: { type: "links", data: { buttons } } },
  ]);
  const block = site.blocks.find((b) => b.type === "links");
  if (!block) throw new Error("blocco links non creato");
  return block.data.buttons ?? [];
}

describe("colore dei pulsanti", () => {
  it("accetta un esadecimale valido sul singolo pulsante", () => {
    const buttons = withLinks([
      { label: "WhatsApp", url: "https://wa.me/393331234567", color: "#22c55e" },
    ]);
    expect(buttons[0].color).toBe("#22c55e");
  });

  it("scarta colori non validi senza rompere il pulsante", () => {
    const buttons = withLinks([
      { label: "WhatsApp", url: "https://wa.me/393331234567", color: "viola" },
      { label: "Menu", url: "https://example.com", color: "#GGGGGG" },
    ]);
    expect(buttons).toHaveLength(2);
    expect(buttons[0].color).toBeUndefined();
    expect(buttons[1].color).toBeUndefined();
    expect(buttons[1].label).toBe("Menu");
  });

  it("senza colore il pulsante resta valido e usa il tema", () => {
    const buttons = withLinks([{ label: "Instagram", url: "https://instagram.com" }]);
    expect(buttons[0].color).toBeUndefined();
  });
});
