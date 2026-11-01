import { describe, expect, it } from "vitest";
import { fontStack, googleFontsHref, isValidFamilyName } from "@/lib/fonts";
import { normalizeSite, THEME_STYLES, THEME_STYLE_LABELS } from "@/lib/site";

const base = {
  meta: { title: "Prova", description: "" },
  blocks: [],
};

describe("font per ruolo", () => {
  it("unisce i font Google usati dai ruoli in un solo link", () => {
    const href = googleFontsHref({ fonts: { heading: "playfair", body: "inter" } });
    expect(href).toBe(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap",
    );
  });

  it("non genera richieste esterne per i font di sistema", () => {
    expect(googleFontsHref({ fonts: { heading: "serif", body: "sans" } })).toBeNull();
    expect(googleFontsHref({})).toBeNull();
  });

  it("include le famiglie importate e scarta quelle non valide", () => {
    const href = googleFontsHref({ customFonts: ["Space Grotesk", "font;evil"] });
    expect(href).toContain("family=Space+Grotesk");
    expect(href).not.toContain("evil");
  });

  it("usa uno stack di ripiego per un nome sconosciuto o pericoloso", () => {
    expect(fontStack("Poppins")).toContain('"Poppins"');
    expect(fontStack('x"; color: red')).not.toContain('"x');
    expect(isValidFamilyName("Poppins")).toBe(true);
    expect(isValidFamilyName("</style>")).toBe(false);
  });

  it("conserva font per ruolo, famiglie importate e stile personalizzato", () => {
    const site = normalizeSite({
      ...base,
      theme: {
        style: "custom",
        fonts: { heading: "playfair", body: "Poppins", label: "" },
        customFonts: ["Poppins", "Poppins", "<script>"],
        look: { radius: "pill", border: "solid", shadow: "none", density: "airy", caps: "all" },
      },
    });

    expect(site?.theme.fonts).toEqual({ heading: "playfair", body: "Poppins" });
    expect(site?.theme.customFonts).toEqual(["Poppins"]);
    expect(site?.theme.look).toEqual({
      radius: "pill",
      border: "solid",
      shadow: "none",
      density: "airy",
      caps: "all",
    });
  });

  it("accetta i nuovi stili e scarta uno stile sconosciuto", () => {
    for (const style of [
      "brutal",
      "paper",
      "mono",
      "sunset",
      "forest",
      "chrome",
      "pastel",
      "riso",
      "blueprint",
    ]) {
      expect(normalizeSite({ ...base, theme: { style } })?.theme.style).toBe(style);
    }
    expect(normalizeSite({ ...base, theme: { style: "inventato" } })?.theme.style).toBe("aurora");
  });

  it("ogni stile del catalogo ha un nome leggibile", () => {
    for (const style of THEME_STYLES) {
      expect(THEME_STYLE_LABELS[style]).toBeTruthy();
    }
  });
});
