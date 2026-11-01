import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SitePreview } from "@/components/SitePreview";
import { normalizeSite, type Site } from "@/lib/site";

const site: Site = {
  meta: { title: "Prova", description: "Prova" },
  theme: {
    bg_color: "#111111",
    text_color: "#fafafa",
    accent_color: "#22d3ee",
    accent2: "#f472b6",
    style: "aurora",
    font: "sans",
  },
  blocks: [{ id: "f1", type: "form", data: { title: "Scrivimi" } }],
};

describe("modulo contatti", () => {
  it("collega l'informativa della pagina, non quella della piattaforma", () => {
    const html = renderToStaticMarkup(
      createElement(SitePreview, { site, siteId: "site_1", slug: "casa-aurora" }),
    );
    expect(html).toContain('href="/s/casa-aurora/privacy"');
    expect(html).not.toContain('href="/privacy"');
  });

  it("senza slug resta un link valido (anteprima nell'editor)", () => {
    const html = renderToStaticMarkup(createElement(SitePreview, { site }));
    expect(html).toContain('href="/privacy"');
  });
});

describe("blocco informazioni", () => {
  const infoSite: Site = {
    ...site,
    blocks: [
      {
        id: "i1",
        type: "info",
        data: {
          title: "Informazioni utili",
          rows: [{ label: "Password Wi-Fi", value: "Aurora2026" }],
        },
      },
    ],
  };

  it("senza il flag non mostra nessun pulsante di copia", () => {
    const html = renderToStaticMarkup(createElement(SitePreview, { site: infoSite }));
    expect(html).toContain("Aurora2026");
    expect(html).toContain("Password Wi-Fi");
    expect(html).not.toContain(">Copia<");
    expect(html).not.toContain("Copiato");
  });

  it("con copy: true mostra il pulsante, solo su quella riga", () => {
    const withCopy: Site = {
      ...infoSite,
      blocks: [
        {
          id: "i1",
          type: "info",
          data: {
            title: "Informazioni utili",
            rows: [
              { label: "Password Wi-Fi", value: "Aurora2026", copy: true },
              { label: "Check-in", value: "dalle 15:00" },
            ],
          },
        },
      ],
    };
    const html = renderToStaticMarkup(createElement(SitePreview, { site: withCopy }));
    expect(html).toContain(">Copia<");
    expect(html).toContain('aria-label="Copia Password Wi-Fi"');
    expect(html).not.toContain('aria-label="Copia Check-in"');
  });

  it("il flag sopravvive al salvataggio e resta solo se è true", () => {
    const normalized = normalizeSite({
      ...infoSite,
      blocks: [
        {
          id: "i1",
          type: "info",
          data: {
            rows: [
              { label: "Password Wi-Fi", value: "Aurora2026", copy: true },
              { label: "Check-in", value: "15:00", copy: "sì" },
            ],
          },
        },
      ],
    });
    expect(normalized?.blocks[0]?.data.rows?.[0]).toEqual({
      label: "Password Wi-Fi",
      value: "Aurora2026",
      copy: true,
    });
    expect(normalized?.blocks[0]?.data.rows?.[1]).toEqual({ label: "Check-in", value: "15:00" });
  });
});
