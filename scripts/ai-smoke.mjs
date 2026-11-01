/**
 * Smoke test dell'assistente contro un'istanza in esecuzione.
 * Costa token Gemini: lancialo a mano o in una job notturna, non a ogni commit.
 *
 *   node scripts/ai-smoke.mjs            (usa http://localhost:3000)
 *   SMOKE_BASE_URL=https://... node scripts/ai-smoke.mjs
 */
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const EMAIL = `smoke-ai-${Date.now()}@example.com`;
const PASSWORD = "password123";

const ALLOWED = new Set(["hero", "banner", "links", "catalog", "hours", "gallery", "info", "form", "contact"]);
const HEX = /^#[0-9a-fA-F]{6}$/;

let cookie = "";
let failures = 0;

async function call(method, path, payload) {
  const headers = {};
  if (payload) headers["Content-Type"] = "application/json";
  if (cookie) headers.cookie = cookie;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) cookie = setCookie[0].split(";")[0];

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

function validate(site) {
  const problems = [];
  if (!site || typeof site !== "object") return ["site mancante"];
  if (!site.meta?.title) problems.push("meta.title mancante");
  for (const key of ["bg_color", "text_color", "accent_color", "accent2"]) {
    if (!HEX.test(String(site.theme?.[key] ?? ""))) problems.push(`theme.${key} non hex`);
  }
  if (!Array.isArray(site.blocks)) return problems.concat("blocks non è un array");
  const ids = new Set();
  site.blocks.forEach((block, i) => {
    if (!ALLOWED.has(block?.type)) problems.push(`blocco ${i}: tipo ${block?.type}`);
    if (!block?.id || ids.has(block.id)) problems.push(`blocco ${i}: id mancante o duplicato`);
    ids.add(block?.id);
    if (!block?.data || typeof block.data !== "object") problems.push(`blocco ${i}: data non valido`);
  });
  return problems;
}

function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

function warn(label, ok, detail = "") {
  console.log(`  ${ok ? "✓" : "⚠"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function say(siteId, message) {
  const res = await call("POST", "/api/chat", { siteId, message });
  if (res.status !== 200) {
    console.log(`  ✗ chat ${res.status}: ${res.text.slice(0, 200)}`);
    failures += 1;
    return null;
  }
  const problems = validate(res.json.site);
  check("JSON valido", problems.length === 0, problems.join("; "));
  return res.json;
}

const register = await call("POST", "/api/auth/register", {
  email: EMAIL,
  password: PASSWORD,
  acceptTerms: true,
});
if (register.status !== 201) {
  console.error(`Registrazione fallita (${register.status}): ${register.text.slice(0, 200)}`);
  process.exit(1);
}

const created = await call("POST", "/api/sites", { title: "Smoke AI" });
const site = created.json.site;
console.log(`sito ${site.slug}`);

try {
  console.log("\n1. comando complesso, tre intenzioni in un messaggio");
  const step1 = await say(
    site.id,
    "Aggiungi una giacca a 80€, metti lo sfondo nero e aggiungi un pulsante WhatsApp con colore viola",
  );
  if (step1) {
    const items = step1.site.blocks.flatMap((b) => b.data.items ?? []);
    const links = step1.site.blocks.flatMap((b) => b.data.buttons ?? []);
    warn("sfondo nero", step1.site.theme.bg_color === "#000000", step1.site.theme.bg_color);
    warn("prodotto a 80€", items.some((p) => p.price === "80€"), items.map((p) => p.price).join(", "));
    warn("pulsante WhatsApp", links.some((b) => /whatsapp/i.test(b.label)));
    warn(
      "colore sul pulsante",
      links.some((b) => b.color === "#8b5cf6"),
      links.map((b) => b.color ?? "tema").join(", "),
    );
  }

  console.log("\n2. correzione di contesto");
  const step2 = await say(site.id, "Anzi no, cancella la giacca e metti un banner di avviso in cima");
  if (step2) {
    const first = step2.site.blocks[0]?.type;
    const stillThere = step2.site.blocks.some((b) =>
      (b.data.items ?? []).some((p) => /giacca/i.test(p.name ?? "")),
    );
    check("banner in cima", first === "banner", `primo blocco: ${first}`);
    check("giacca rimossa", !stillThere);
  }

  console.log("\n3. contenuti lunghi e caratteri speciali");
  const description =
    'Cotone bio, taglia M/L, lavaggio a 30°, cuciture rinforzate e zip YKK. Nota: "limited edition" — prodotta in Italia.';
  const step3 = await say(
    site.id,
    `Aggiungi al catalogo una felpa a €1.234,56 con descrizione: ${description}`,
  );
  if (step3) {
    const saved = await call("GET", `/api/sites/${site.id}`);
    const items = saved.json.site.config.blocks.flatMap((b) => b.data.items ?? []);
    const product = items.find((p) => /felpa/i.test(p.name ?? ""));
    check("descrizione salvata", Boolean(product?.description), product?.description?.slice(0, 60));
    check("prezzo con migliaia", Boolean(product?.price?.includes("1.234,56")), product?.price);
  }
} finally {
  const cleanup = await call("DELETE", "/api/account", { password: PASSWORD });
  console.log(`\ncleanup ${cleanup.status}`);
}

console.log(failures === 0 ? "\nSmoke test superato." : `\n${failures} controllo/i falliti.`);
process.exit(failures === 0 ? 0 : 1);
