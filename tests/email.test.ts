import { describe, expect, it } from "vitest";
import { escapeHtml, leadNotificationHtml } from "@/lib/email";

describe("escapeHtml", () => {
  it("neutralizza i caratteri speciali", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("leadNotificationHtml", () => {
  it("non inietta HTML scritto dal visitatore", () => {
    const html = leadNotificationHtml({
      title: "<b>Bar</b>",
      url: "https://novapage.site/sites/site_1",
      name: "<img src=x onerror=alert(1)>",
      email: "a@b.it",
      phone: "",
      message: "<script>alert(1)</script>",
      at: "01/11/2026, 10:00",
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Bar</b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("mostra un segnaposto quando il messaggio è vuoto", () => {
    const html = leadNotificationHtml({
      title: "Bar",
      url: "https://novapage.site/sites/site_1",
      name: "",
      email: "",
      phone: "",
      message: "",
      at: "01/11/2026",
    });
    expect(html).toContain("(nessun messaggio)");
  });
});
