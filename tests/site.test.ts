import { describe, expect, it } from "vitest";
import {
  INITIAL_SITE,
  applyToolCalls,
  normalizeAsk,
  normalizeSite,
  type Site,
} from "@/lib/site";

describe("normalizeAsk", () => {
  it("accetta un modulo valido", () => {
    const ask = normalizeAsk({
      intro: "Mi servono due dati",
      fields: [{ label: "Nome", type: "text", required: true }],
    });

    expect(ask).not.toBeNull();
    expect(ask?.intro).toBe("Mi servono due dati");
    expect(ask?.fields).toHaveLength(1);
    expect(ask?.fields[0]).toMatchObject({ key: "nome", label: "Nome", type: "text", required: true });
  });

  it("restituisce null senza campi utilizzabili", () => {
    expect(normalizeAsk(null)).toBeNull();
    expect(normalizeAsk(undefined)).toBeNull();
    expect(normalizeAsk({})).toBeNull();
    expect(normalizeAsk({ fields: [] })).toBeNull();
    expect(normalizeAsk({ fields: [{ type: "text" }] })).toBeNull();
  });

  it("normalizza i tipi non ammessi in testo", () => {
    const ask = normalizeAsk({ fields: [{ label: "Età", type: "password" }, { label: "Email", type: "email" }] });
    expect(ask?.fields[0].type).toBe("text");
    expect(ask?.fields[1].type).toBe("email");
  });

  it("genera chiavi stabili e salta i duplicati", () => {
    const ask = normalizeAsk({
      fields: [{ label: "Numero di telefono" }, { label: "Numero di telefono" }],
    });
    expect(ask?.fields).toHaveLength(1);
    expect(ask?.fields[0].key).toBe("numero_di_telefono");
  });

  it("limita a 6 campi", () => {
    const ask = normalizeAsk({
      fields: Array.from({ length: 9 }, (_, i) => ({ label: `Campo ${i}` })),
    });
    expect(ask?.fields).toHaveLength(6);
  });
});

describe("normalizeSite", () => {
  it("rifiuta un payload senza blocchi", () => {
    expect(normalizeSite(null)).toBeNull();
    expect(normalizeSite({ theme: {} })).toBeNull();
    expect(normalizeSite({ blocks: "niente" })).toBeNull();
  });

  it("scarta blocchi sconosciuti e valori di tema non validi", () => {
    const site = normalizeSite({
      meta: { title: "Bar Aurora", description: "Caffè e brioche" },
      theme: { bg_color: "#000000", accent_color: "rosso", style: "neon", font: "serif" },
      blocks: [
        { id: "b1", type: "hero", data: { title: "Ciao" } },
        { id: "b2", type: "sconosciuto", data: {} },
      ],
      legal: { vat: "IT01234567890" },
    });

    expect(site).not.toBeNull();
    expect(site?.blocks).toHaveLength(1);
    expect(site?.blocks[0].type).toBe("hero");
    expect(site?.theme.bg_color).toBe("#000000");
    expect(site?.theme.accent_color).toBe(INITIAL_SITE.theme.accent_color);
    expect(site?.theme.style).toBe("neon");
    expect(site?.theme.font).toBe("serif");
    expect(site?.legal?.vat).toBe("IT01234567890");
  });

  it("blocca i link javascript: e mantiene quelli relativi", () => {
    const site = normalizeSite({
      meta: { title: "Link" },
      blocks: [
        {
          id: "b1",
          type: "links",
          data: {
            buttons: [
              { label: "Malevolo", url: "javascript:alert(1)" },
              { label: "Upload", url: "/uploads/foto.png" },
            ],
          },
        },
      ],
    });

    const buttons = site?.blocks[0].data.buttons ?? [];
    expect(buttons[0].url).toBe("");
    expect(buttons[1].url).toBe("/uploads/foto.png");
  });
});

describe("applyToolCalls", () => {
  it("aggiorna il tema solo con colori validi", () => {
    const result = applyToolCalls(INITIAL_SITE, [
      {
        name: "update_theme",
        args: { bg_color: "#000000", accent_color: "non-un-colore", style: "neon", font: "serif" },
      },
    ]);

    expect(result.theme.bg_color).toBe("#000000");
    expect(result.theme.accent_color).toBe(INITIAL_SITE.theme.accent_color);
    expect(result.theme.style).toBe("neon");
    expect(result.theme.font).toBe("serif");
  });

  it("non modifica il sito di partenza", () => {
    const original: Site = structuredClone(INITIAL_SITE);
    applyToolCalls(original, [{ name: "update_theme", args: { bg_color: "#ffffff" } }]);
    expect(original).toEqual(INITIAL_SITE);
  });

  it("aggiunge un blocco con i dati predefiniti e quelli richiesti", () => {
    const result = applyToolCalls(INITIAL_SITE, [
      { name: "add_block", args: { type: "gallery", data: { title: "Foto del locale" } } },
    ]);

    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[1].type).toBe("gallery");
    expect(result.blocks[1].id.startsWith("blk_")).toBe(true);
    expect(result.blocks[1].data.title).toBe("Foto del locale");
    expect(result.blocks[1].data.images).toEqual([]);
  });

  it("aggiorna un blocco esistente", () => {
    const site: Site = {
      ...INITIAL_SITE,
      blocks: [{ id: "blk_test", type: "hero", data: { title: "Vecchio titolo" } }],
    };
    const result = applyToolCalls(site, [
      { name: "update_block", args: { block_id: "blk_test", data: { title: "Nuovo titolo" } } },
    ]);
    expect(result.blocks[0].data.title).toBe("Nuovo titolo");
  });

  it("ignora le chiamate non valide senza lanciare", () => {
    const result = applyToolCalls(INITIAL_SITE, [
      { name: "non_esiste", args: {} },
      { name: "add_block", args: { type: "sconosciuto" } },
      { name: "delete_block", args: {} },
      { name: "set_meta", args: { title: "Titolo nuovo" } },
    ]);

    expect(result.blocks).toEqual(INITIAL_SITE.blocks);
    expect(result.meta.title).toBe("Titolo nuovo");
  });
});
