import { describe, expect, it } from "vitest";
import { siteReadiness } from "@/lib/readiness";
import { INITIAL_SITE, type Site } from "@/lib/site";

const ready: Site = {
  meta: {
    title: "Bar Aurora",
    description: "Caffetteria e aperitivi in centro a Milano, aperti dal 1998.",
  },
  theme: INITIAL_SITE.theme,
  blocks: [{ id: "b1", type: "contact", data: { phone: "3331234567", address: "Via Roma 1, Milano" } }],
};

const failed = (site: Site) =>
  siteReadiness(site)
    .filter((item) => !item.ok)
    .map((item) => item.key);

describe("siteReadiness", () => {
  it("considera pronta una pagina con titolo, descrizione e contatti", () => {
    expect(failed(ready)).toEqual([]);
  });

  it("segnala i segnaposto del template", () => {
    expect(failed(INITIAL_SITE)).toContain("title");
    expect(failed(INITIAL_SITE)).toContain("description");
  });

  it("segnala i pulsanti senza URL e la mancanza di contatti", () => {
    const site: Site = {
      ...ready,
      blocks: [{ id: "b1", type: "links", data: { buttons: [{ label: "Scrivici", url: "" }] } }],
    };
    expect(failed(site)).toEqual(expect.arrayContaining(["contact", "links"]));
  });

  it("richiede i dati del titolare quando ci sono prezzi", () => {
    const site: Site = {
      ...ready,
      blocks: [
        ...ready.blocks,
        {
          id: "b2",
          type: "catalog",
          data: { items: [{ id: "p1", name: "Cappuccino", price: "1,50€" }] },
        },
      ],
    };
    expect(failed(site)).toContain("legal");
    expect(failed({ ...site, legal: { businessName: "Aurora Srl", vat: "IT01234567890" } })).not.toContain(
      "legal",
    );
  });
});
