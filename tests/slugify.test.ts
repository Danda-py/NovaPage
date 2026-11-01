import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/store";

describe("slugify", () => {
  it("normalizza gli accenti", () => {
    expect(slugify("Caffè della Piazza")).toBe("caffe-della-piazza");
    expect(slugify("Perché no")).toBe("perche-no");
  });

  it("trasforma spazi e simboli in un solo trattino", () => {
    expect(slugify("  Studio   Aurora!!  ")).toBe("studio-aurora");
    expect(slugify("Sneakers & Streetwear")).toBe("sneakers-streetwear");
  });

  it("non lascia trattini ai bordi", () => {
    expect(slugify("---Ciao---")).toBe("ciao");
    expect(slugify("...Aurora...")).toBe("aurora");
  });

  it("usa il fallback quando non resta nulla", () => {
    expect(slugify("")).toBe("la-mia-pagina");
    expect(slugify("!!!")).toBe("la-mia-pagina");
  });

  it("taglia a 40 caratteri", () => {
    expect(slugify("a".repeat(80))).toHaveLength(40);
  });
});
