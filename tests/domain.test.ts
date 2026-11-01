import { describe, expect, it } from "vitest";
import { apexOf, domainRecords, hostPair, isPlatformHost, normalizeDomain } from "@/lib/domain";

describe("isPlatformHost", () => {
  it("tratta il www della piattaforma come la piattaforma stessa", () => {
    expect(isPlatformHost("novapage.site", "novapage.site")).toBe(true);
    expect(isPlatformHost("www.novapage.site", "novapage.site")).toBe(true);
    expect(isPlatformHost("NOVAPAGE.SITE", "novapage.site")).toBe(true);
  });

  it("lascia passare i domini dei clienti", () => {
    expect(isPlatformHost("miosito.it", "novapage.site")).toBe(false);
    expect(isPlatformHost("www.miosito.it", "novapage.site")).toBe(false);
    expect(isPlatformHost("novapage.site", "")).toBe(false);
    expect(isPlatformHost("", "novapage.site")).toBe(false);
  });
});

describe("normalizeDomain", () => {
  it("accetta URL completi e restituisce solo l'hostname", () => {
    expect(normalizeDomain("https://www.MioSito.it/")).toBe("www.miosito.it");
    expect(normalizeDomain("http://miosito.it")).toBe("miosito.it");
    expect(normalizeDomain("  MIOSITO.IT  ")).toBe("miosito.it");
  });

  it("rifiuta IP, porte, percorsi e testo libero", () => {
    expect(normalizeDomain("192.168.1.1")).toBeNull();
    expect(normalizeDomain("miosito.it:8080")).toBeNull();
    expect(normalizeDomain("miosito.it/pagina")).toBeNull();
    expect(normalizeDomain("mio sito.it")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("tizio@miosito.it")).toBeNull();
    expect(normalizeDomain("")).toBeNull();
  });

  it("rifiuta etichette con trattini ai bordi", () => {
    expect(normalizeDomain("-miosito.it")).toBeNull();
    expect(normalizeDomain("mio-.it")).toBeNull();
    expect(normalizeDomain("mio-sito.it")).toBe("mio-sito.it");
  });
});

describe("coppia apex e www", () => {
  it("riconosce l'apex", () => {
    expect(apexOf("miosito.it")).toBe("miosito.it");
    expect(apexOf("www.miosito.it")).toBe("miosito.it");
  });

  it("collega sempre l'altro nome della coppia", () => {
    expect(hostPair("miosito.it")).toEqual({ primary: "miosito.it", alias: "www.miosito.it" });
    expect(hostPair("www.miosito.it")).toEqual({ primary: "www.miosito.it", alias: "miosito.it" });
  });
});

describe("domainRecords", () => {
  it("per l'apex usa un A e mette il CNAME sul www", () => {
    const records = domainRecords("miosito.it", "abc123");
    expect(records.txtName).toBe("_novapage.miosito.it");
    expect(records.txtValue).toBe("novapage-verify=abc123");
    expect(records.hosts).toEqual(["miosito.it", "www.miosito.it"]);
    expect(records.dns).toEqual([
      { host: "miosito.it", type: "A", name: "miosito.it", value: expect.any(String) },
      {
        host: "www.miosito.it",
        type: "CNAME",
        name: "www.miosito.it",
        value: expect.any(String),
      },
    ]);
  });

  it("partendo dal www il TXT resta sull'apex", () => {
    const records = domainRecords("www.miosito.it", "abc123");
    expect(records.txtName).toBe("_novapage.miosito.it");
    expect(records.hosts).toEqual(["www.miosito.it", "miosito.it"]);
    expect(records.dns.map((record) => record.type)).toEqual(["CNAME", "A"]);
  });
});
