import { describe, expect, it } from "vitest";
import { isHtmlPage, plainText, sanitizeHtml, toHtmlFragment } from "@/lib/html";
import { applyToolCalls, normalizeSite } from "@/lib/site";

const BLOCKS = [{ id: "blk_1", type: "hero", data: { title: "Casa Aurora" } }];

describe("sanitizeHtml", () => {
  it("rimuove gli script, anche con attributi e su più righe", () => {
    const html = `<h1>Ciao</h1><script>alert(1)</script><script src="/x.js"></script>`;
    const clean = sanitizeHtml(html);
    expect(clean).toContain("<h1>Ciao</h1>");
    expect(clean.toLowerCase()).not.toContain("script");
  });

  it("rimuove i gestori di evento inline", () => {
    const clean = sanitizeHtml('<img src="/a.png" onerror="alert(1)"><a href="#" ONCLICK="x()">l</a>');
    expect(clean).not.toMatch(/onerror|onclick/i);
    expect(clean).toContain("/a.png");
  });

  it("neutralizza gli URL con schemi pericolosi", () => {
    const clean = sanitizeHtml('<a href="javascript:alert(1)">x</a><a href="https://ok.it">y</a>');
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain('href="#"');
    expect(clean).toContain("https://ok.it");
  });

  it("tiene il CSS tranne expression()", () => {
    const clean = sanitizeHtml("<style>.a{color:red;width:expression(alert(1))}</style>");
    expect(clean).toContain("color:red");
    expect(clean).not.toContain("expression(");
  });

  it("rimuove iframe e meta", () => {
    const clean = sanitizeHtml('<iframe src="https://evil"></iframe><meta http-equiv="refresh"><p>testo</p>');
    expect(clean).not.toMatch(/iframe|http-equiv/i);
    expect(clean).toContain("testo");
  });
});

describe("toHtmlFragment", () => {
  it("riduce un documento completo al body, conservando gli stili", () => {
    const doc =
      "<!DOCTYPE html><html><head><style>body{margin:0}</style></head><body><h1>Hey</h1></body></html>";
    const fragment = toHtmlFragment(doc);
    expect(fragment).toContain("<style>body{margin:0}</style>");
    expect(fragment).toContain("<h1>Hey</h1>");
    expect(fragment.toLowerCase()).not.toContain("<html");
    expect(fragment.toLowerCase()).not.toContain("<body");
  });

  it("lascia intatto un frammento", () => {
    expect(toHtmlFragment("<section>ok</section>")).toBe("<section>ok</section>");
  });
});

describe("plainText", () => {
  it("estrae il testo utile", () => {
    expect(plainText("<style>.a{}</style><p>Ciao <b>mondo</b></p>")).toBe("Ciao mondo");
  });
});

describe("modalità HTML libero del sito", () => {
  it("riconosce una pagina in HTML", () => {
    expect(isHtmlPage({ html: "<h1>x</h1>" })).toBe(true);
    expect(isHtmlPage({ html: "   " })).toBe(false);
    expect(isHtmlPage({})).toBe(false);
  });

  it("normalizza e sanifica l'HTML salvato", () => {
    const site = normalizeSite({
      meta: { title: "Studio", description: "x" },
      blocks: BLOCKS,
      html: "<h1>Studio</h1><script>alert(1)</script>",
    });
    expect(site?.html).toContain("<h1>Studio</h1>");
    expect(site?.html?.toLowerCase()).not.toContain("script");
  });

  it("write_html imposta la pagina e i metadati SEO", () => {
    const site = normalizeSite({ meta: { title: "Studio" }, blocks: BLOCKS })!;
    const next = applyToolCalls(site, [
      {
        name: "write_html",
        args: {
          html: "<style>h1{font-size:3rem}</style><h1>Studio Aurora</h1>",
          title: "Studio Aurora",
          description: "Consulenza a Milano",
        },
        },
    ]);
    expect(next.html).toContain("Studio Aurora");
    expect(next.meta.title).toBe("Studio Aurora");
    expect(next.meta.description).toBe("Consulenza a Milano");
  });

  it("ignora un write_html senza contenuto", () => {
    const site = normalizeSite({ meta: { title: "Studio" }, blocks: BLOCKS })!;
    const next = applyToolCalls(site, [{ name: "write_html", args: { html: "   " } }]);
    expect(next.html).toBeUndefined();
  });
});
