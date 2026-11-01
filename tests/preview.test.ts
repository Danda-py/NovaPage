import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SitePreview } from "@/components/SitePreview";
import type { Site } from "@/lib/site";

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

  it("mostra la password senza pulsante di copia", () => {
    const html = renderToStaticMarkup(createElement(SitePreview, { site: infoSite }));
    expect(html).toContain("Aurora2026");
    expect(html).toContain("Password Wi-Fi");
    expect(html).not.toContain(">Copia<");
    expect(html).not.toContain("Copiato");
  });
});
