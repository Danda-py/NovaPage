import { describe, expect, it } from "vitest";
import { sanitizeHtmlStrict } from "@/lib/html-strict";

describe("sanitizeHtmlStrict (parser)", () => {
  it("elimina gli script eseguibili e le loro dipendenze", () => {
    const clean = sanitizeHtmlStrict(
      '<h1>Ciao</h1><script>alert(1)</script><script src="/x.js"></script><iframe src="https://e"></iframe>',
    );
    expect(clean).toContain("<h1>Ciao</h1>");
    expect(clean.toLowerCase()).not.toContain("<script");
    expect(clean.toLowerCase()).not.toContain("iframe");
  });

  it("conserva i dati strutturati JSON-LD validi", () => {
    const clean = sanitizeHtmlStrict(
      '<p>ok</p><script type="application/ld+json">{"@type":"LocalBusiness"}</script>',
    );
    expect(clean).toContain("LocalBusiness");
    expect(clean).toContain("application/ld+json");
  });

  it("scarta un JSON-LD non valido", () => {
    const clean = sanitizeHtmlStrict('<script type="application/ld+json">{rotto</script><p>ok</p>');
    expect(clean).not.toContain("ld+json");
    expect(clean).toContain("<p>ok</p>");
  });

  it("rimuove gestori di evento e attributi che li nascondono", () => {
    const clean = sanitizeHtmlStrict(
      '<img src="/a.png" onerror="alert(1)"><svg onload="alert(2)"></svg><div onmouseover="x()">t</div>',
    );
    expect(clean).not.toMatch(/onerror|onload|onmouseover/i);
  });

  it("neutralizza gli schemi pericolosi negli URL", () => {
    const clean = sanitizeHtmlStrict('<a href="javascript:alert(1)">x</a><a href="https://ok.it">y</a>');
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("https://ok.it");
  });

  it("tiene CSS e markup normali, senza toccare il design", () => {
    const clean = sanitizeHtmlStrict("<style>.a{color:#f00}.b{width:expression(1)}</style><p class='a'>t</p>");
    expect(clean).toContain(".a{color:#f00}");
    expect(clean).not.toContain("expression(");
    expect(clean).toContain('<p class="a">t</p>');
  });
});
