import { describe, expect, it } from "vitest";
import {
  applyHtmlPatches,
  htmlOutline,
  htmlPalette,
  injectLeadForm,
  injectLeadValues,
  injectLegalLinks,
  isHtmlPage,
  isLightColor,
  plainText,
  sanitizeHtml,
  toHtmlFragment,
  validateHtml,
} from "@/lib/html";
import { applyToolCalls, normalizeSite, withLegalAck } from "@/lib/site";

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

  it("conserva i dati strutturati JSON-LD validi", () => {
    const jsonLd = '{"@context":"https://schema.org","@type":"LocalBusiness","name":"Casa Aurora"}';
    const clean = sanitizeHtml(
      `<p>ok</p><script type="application/ld+json">${jsonLd}</script><script>alert(1)</script>`,
    );
    expect(clean).toContain("LocalBusiness");
    expect(clean).toContain('type="application/ld+json"');
    expect(clean).not.toContain("alert(1)");
  });

  it("scarta un JSON-LD non valido insieme agli altri script", () => {
    const clean = sanitizeHtml('<script type="application/ld+json">{rotto</script><h1>x</h1>');
    expect(clean).not.toContain("ld+json");
    expect(clean).toContain("<h1>x</h1>");
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

describe("palette e struttura lette dal CSS", () => {
  it("legge i colori dalle custom property", () => {
    const palette = htmlPalette(":root{--bg:#0b1113;--text:#eef4f2;--accent:#d9b26a}");
    expect(palette).toEqual({ bg: "#0b1113", text: "#eef4f2", accent: "#d9b26a" });
  });

  it("distingue fondo chiaro e scuro", () => {
    expect(isLightColor("#faf8f5")).toBe(true);
    expect(isLightColor("#0b1113")).toBe(false);
  });

  it("descrive la struttura senza tutto il CSS", () => {
    const outline = htmlOutline("<style>.a{}</style><h1>Studio Aurora</h1><section></section><a href='#'>x</a>");
    expect(outline).toContain("Studio Aurora");
    expect(outline).toContain("1 sezioni");
    expect(outline).not.toContain(".a{}");
  });
});

describe("modulo contatti delle pagine HTML", () => {
  it("aggiunge slug e honeypot al modulo marcato", () => {
    const html = injectLeadForm('<form action="/api/leads/form" method="post" data-novapage-lead></form>', "casa-aurora");
    expect(html).toContain('name="slug" value="casa-aurora"');
    expect(html).toContain('name="website"');
  });

  it("non tocca i moduli non marcati", () => {
    const html = '<form action="https://esterno.it"></form>';
    expect(injectLeadForm(html, "x")).toBe(html);
  });

  it("neutralizza uno slug con caratteri strani", () => {
    const html = injectLeadForm("<form data-novapage-lead>", 'a"onerror="x');
    // lo slug perde virgolette e spazi: non può chiudere l'attributo e iniettare codice
    expect(html).not.toMatch(/onerror\s*=/);
    expect(html).not.toContain('""');
    expect(html).toContain('name="slug" value="aonerrorx"');
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

  it("registra la responsabilità solo al primo passaggio in HTML", () => {
    const blocks = normalizeSite({ meta: { title: "Studio" }, blocks: BLOCKS })!;
    const first = withLegalAck(blocks, { ...blocks, html: "<h1>x</h1>" }, { ip: "1.2.3.4" });
    expect(first.legalAck?.notice).toBe("html-v1");
    expect(first.legalAck?.ip).toBe("1.2.3.4");

    const later = withLegalAck(first, { ...first, html: "<h1>y</h1>" });
    expect(later.legalAck?.at).toBe(first.legalAck?.at);

    expect(withLegalAck(blocks, blocks).legalAck).toBeUndefined();
  });

  it("legge una vecchia data di responsabilità e la converte", () => {
    const site = normalizeSite({
      meta: { title: "Studio" },
      blocks: BLOCKS,
      html: "<h1>x</h1>",
      legalAckAt: "2026-01-01T00:00:00.000Z",
    });
    expect(site?.legalAck?.at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("patch_html modifica solo il frammento indicato", () => {
    const site = normalizeSite({
      meta: { title: "Studio" },
      blocks: BLOCKS,
      html: '<h1>Vecchio</h1><p>testo</p>',
    })!;
    const next = applyToolCalls(site, [
      { name: "patch_html", args: { patches: [{ find: "<h1>Vecchio</h1>", replace: "<h1>Nuovo</h1>" }] } },
    ]);
    expect(next.html).toContain("<h1>Nuovo</h1>");
    expect(next.html).toContain("<p>testo</p>");
  });

  it("patch_html rifiuta un find ambiguo", () => {
    const result = applyHtmlPatches("<p>a</p>".repeat(4), [{ find: "<p>a</p>", replace: "<p>b</p>" }]);
    expect(result.applied).toBe(0);
    expect(result.failed[0]).toContain("4 occorrenze");
  });

  it("segnala un HTML troncato", () => {
    expect(validateHtml('<div><section><h1>Titolo</h1>')).not.toHaveLength(0);
    expect(validateHtml("<style>.a{}</style><h1>Ok</h1>")).toHaveLength(0);
    expect(validateHtml("<p class=")).not.toHaveLength(0);
  });

  it("rimette i valori compilati nel modulo", () => {
    const html = injectLeadValues(
      '<form><input name="email"><textarea name="message"></textarea></form>',
      { email: 'anna@example.com"x', message: "Vorrei info" },
    );
    expect(html).toContain('value="anna@example.com&quot;x"');
    expect(html).toContain(">Vorrei info</textarea>");
  });

  it("riempie il segnaposto dei link legali", () => {
    const html = injectLegalLinks('<footer><span data-novapage-legal></span></footer>', "casa-aurora");
    expect(html).toContain("/s/casa-aurora/privacy");
    expect(html).toContain("/s/casa-aurora/termini");
    expect(html).not.toContain("data-novapage-legal");
  });

  it("ignora un write_html senza contenuto", () => {
    const site = normalizeSite({ meta: { title: "Studio" }, blocks: BLOCKS })!;
    const next = applyToolCalls(site, [{ name: "write_html", args: { html: "   " } }]);
    expect(next.html).toBeUndefined();
  });
});
