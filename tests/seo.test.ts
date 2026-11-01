import { describe, expect, it } from "vitest";
import {
  jsonLdScript,
  pageDescription,
  parsePrice,
  siteJsonLd,
  socialProfileUrls,
  homeJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import { INITIAL_SITE, type Site } from "@/lib/site";

const baseUrl = "https://novapage.site";

const shop: Site = {
  meta: {
    title: "Sneaker Room",
    description: "Sneakers selezionate a Milano, spedizioni in tutta Italia.",
  },
  theme: INITIAL_SITE.theme,
  legal: { businessName: "Sneaker Room Srl", vat: "IT01234567890", address: "Via Roma 1, Milano" },
  blocks: [
    {
      id: "b1",
      type: "contact",
      data: { phone: "3331234567", email: "ciao@sneaker.it", address: "Via Roma 1, Milano" },
    },
    { id: "b2", type: "hours", data: { hours: [{ day: "Lun - Sab", time: "10:00 - 19:00" }] } },
    {
      id: "b3",
      type: "links",
      data: {
        buttons: [
          { label: "Instagram", url: "https://instagram.com/sneakerroom" },
          { label: "Scrivici", url: "https://wa.me/393331234567" },
          { label: "Mappa", url: "https://maps.google.com" },
        ],
      },
    },
    {
      id: "b4",
      type: "catalog",
      data: {
        items: [
          { id: "p1", name: "Air Max", price: "129,90 €", status: "Disponibile" },
          { id: "p2", name: "Dunk Low", price: "149€", status: "Sold Out" },
          { id: "p3", name: "Su ordinazione", price: "Su richiesta" },
        ],
      },
    },
  ],
};

type Node = Record<string, unknown>;
const graph = (data: Record<string, unknown>) => data["@graph"] as Node[];
const node = (data: Record<string, unknown>, suffix: string) =>
  graph(data).find((entry) => String(entry["@id"] ?? "").endsWith(suffix)) as Node | undefined;

describe("parsePrice", () => {
  it("legge i formati usati nelle schede prodotto", () => {
    expect(parsePrice("12€")).toBe(12);
    expect(parsePrice("1,50 €")).toBe(1.5);
    expect(parsePrice("39.90")).toBe(39.9);
    expect(parsePrice("90€/mese")).toBe(90);
  });

  it("restituisce null quando non c'è un prezzo", () => {
    expect(parsePrice("Su richiesta")).toBeNull();
    expect(parsePrice("")).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
  });
});

describe("socialProfileUrls", () => {
  it("prende solo i profili social, non le mappe", () => {
    expect(socialProfileUrls(shop)).toEqual([
      "https://instagram.com/sneakerroom",
      "https://wa.me/393331234567",
    ]);
  });
});

describe("jsonLdScript", () => {
  it("non permette di chiudere il tag script", () => {
    const payload = jsonLdScript({ x: "</script><img src=x onerror=alert(1)>" });
    expect(payload).not.toContain("</script>");
    expect(payload).toContain("\\u003c");
  });
});

describe("siteJsonLd", () => {
  const data = siteJsonLd({ site: shop, slug: "sneaker-room", baseUrl });

  it("descrive la vetrina come Store con contatti, orari e dati fiscali", () => {
    const business = node(data, "#business");
    expect(business?.["@type"]).toBe("Store");
    expect(business?.telephone).toBe("3331234567");
    expect(business?.email).toBe("ciao@sneaker.it");
    expect(business?.vatID).toBe("IT01234567890");
    expect(business?.openingHours).toEqual(["Lun - Sab: 10:00 - 19:00"]);
    expect(business?.legalName).toBe("Sneaker Room Srl");
  });

  it("espone i prodotti con prezzo e disponibilità", () => {
    const list = node(data, "#prodotti");
    const items = list?.itemListElement as Node[];
    expect(items).toHaveLength(2); // "Su richiesta" non ha prezzo: non viene dichiarato

    const offers = items.map((entry) => (entry.item as Node).offers as Node);
    expect(offers[0].price).toBe(129.9);
    expect(offers[1].availability).toBe("https://schema.org/OutOfStock");
  });

  it("dichiara URL, pagina e breadcrumb assoluti", () => {
    expect(node(data, "#webpage")?.url).toBe(`${baseUrl}/s/sneaker-room`);
    expect(node(data, "#breadcrumb")).toBeDefined();
    expect(node(data, "#website")?.url).toBe(baseUrl);
    expect(JSON.stringify(data)).toContain(`${baseUrl}/s/sneaker-room`);
  });

  it("non inventa indirizzo né orari quando mancano", () => {
    const data = siteJsonLd({
      site: { ...INITIAL_SITE, meta: { title: "Studio", description: "Consulenze" } },
      slug: "studio",
      baseUrl,
    });
    const business = node(data, "#business");
    expect(business?.address).toBeUndefined();
    expect(business?.openingHours).toBeUndefined();
    expect(business?.["@type"]).toBe("Organization");
  });
});

describe("pageDescription", () => {
  it("usa la descrizione dell'utente quando è completa", () => {
    expect(pageDescription(shop, shop.meta.title)).toBe(shop.meta.description);
  });

  it("sostituisce un segnaposto con una descrizione dai contenuti reali", () => {
    const text = pageDescription(
      {
        ...shop,
        meta: { title: "Sneaker Room", description: "Pagina creata con NovaPage" },
        blocks: [{ id: "b1", type: "hero", data: { subtitle: "Sneakers selezionate a Milano" } }],
      },
      "Sneaker Room",
    );
    expect(text).toContain("Sneakers selezionate a Milano");
    expect(text).not.toContain("NovaPage");
  });

  it("non supera i 160 caratteri", () => {
    const long = "Sneakers selezionate a mano, spedizioni in tutta Italia in 24 ore, reso gratuito entro 30 giorni e assistenza dedicata";
    const text = pageDescription(
      { ...shop, meta: { title: shop.meta.title, description: long } },
      shop.meta.title,
    );
    expect(text.length).toBeLessThanOrEqual(160);
  });
});

describe("webPageJsonLd", () => {
  it("descrive le pagine istituzionali con WebPage e breadcrumb", () => {
    const data = webPageJsonLd({
      title: "Informativa privacy",
      description: "Quali dati raccoglie NovaPage.",
      path: "/privacy",
      baseUrl,
    });
    const types = graph(data).map((entry) => entry["@type"]);
    expect(types).toContain("WebPage");
    expect(types).toContain("BreadcrumbList");
    expect(node(data, "#webpage")?.url).toBe(`${baseUrl}/privacy`);
  });
});

describe("homeJsonLd", () => {
  it("include organizzazione, applicazione e FAQ", () => {
    const data = homeJsonLd({
      baseUrl,
      faq: [{ question: "Quanto costa?", answer: "La beta è gratuita." }],
    });
    expect(node(data, "#organization")).toBeDefined();
    expect(node(data, "#faq")?.["@type"]).toBe("FAQPage");
    expect(JSON.stringify(data)).toContain("SoftwareApplication");
  });
});
