import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SitePreview } from "@/components/SitePreview";
import type { Site, ThemeStyle } from "@/lib/site";

const base: Site = {
  meta: { title: "Prova", description: "Prova" },
  theme: { bg_color: "#111111", text_color: "#fafafa", accent_color: "#22d3ee", accent2: "#f472b6", style: "aurora", font: "sans" },
  blocks: [
    { id: "b1", type: "hero", data: { title: "Titolo", subtitle: "Sottotitolo" } },
    { id: "b2", type: "catalog", data: { title: "Catalogo", items: [{ id: "p1", name: "A", price: "10€" }] } },
  ],
};

const render = (style: ThemeStyle) =>
  renderToStaticMarkup(
    createElement(SitePreview, { site: { ...base, theme: { ...base.theme, style } } }),
  );

describe("i nuovi temi cambiano davvero la pagina", () => {
  it("nessuno stile produce lo stesso markup di un altro", () => {
    const styles: ThemeStyle[] = ["aurora", "sunset", "forest", "chrome", "pastel", "riso", "blueprint"];
    const seen = new Map<string, ThemeStyle>();
    for (const style of styles) {
      const html = render(style);
      expect(html.length).toBeGreaterThan(500);
      expect(seen.get(html), `${style} identico a ${seen.get(html)}`).toBeUndefined();
      seen.set(html, style);
    }
  });

  it("riso ha il puntinato, pastel i bordi tondi, blueprint la griglia", () => {
    expect(render("riso")).toContain("9px 9px");
    expect(render("pastel")).toContain("border-radius:9999px");
    expect(render("blueprint")).toContain("24px 24px");
  });
});
