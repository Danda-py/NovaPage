/**
 * Controllo visivo e di accessibilità con Chromium (headless).
 *
 *   node scripts/visual-check.mjs --base-url=http://localhost:3000 --path=/,/s/casa-aurora
 *
 * Per ogni pagina: screenshot mobile e desktop, poi quattro verifiche che
 * rompono l'esperienza più spesso di quanto sembri — scorrimento orizzontale,
 * immagini senza alt, bersagli tattili troppo piccoli, testo a contrasto basso.
 * Esce con codice 1 se qualcosa fallisce.
 */
import { mkdirSync, readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

function arg(name, fallback) {
  const found = process.argv.find((value) => value.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : fallback;
}

function findChromium() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(cache)) return null;
  for (const entry of readdirSync(cache)) {
    if (!entry.startsWith("chromium")) continue;
    for (const candidate of ["chrome-linux64/chrome", "chrome-linux/chrome", "chrome-headless-shell-linux64/headless_shell"]) {
      const full = join(cache, entry, candidate);
      if (existsSync(full)) return full;
    }
  }
  return null;
}

const BASE = arg("--base-url", "http://localhost:3000");
const PAGES = arg("--path", "/").split(",").map((value) => value.trim()).filter(Boolean);
const CHROME = findChromium();

if (!CHROME) {
  console.error("Chromium non trovato: imposta CHROME_PATH o installa con `npx playwright install chromium`.");
  process.exit(2);
}

mkdirSync("data/shots", { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

let failures = 0;
const fail = (message) => {
  console.log(`  ✗ ${message}`);
  failures += 1;
};
const pass = (message) => console.log(`  ✓ ${message}`);

for (const path of PAGES) {
  const page = await browser.newPage();
  const name = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";

  for (const [label, viewport] of [
    ["mobile", { width: 390, height: 844 }],
    ["desktop", { width: 1280, height: 900 }],
  ]) {
    await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
    const response = await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 60_000 });
    const status = response?.status() ?? 0;
    await page.screenshot({ path: `data/shots/${name}-${label}.png` });

    const report = await page.evaluate(() => {
      const parse = (color) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = ([r, g, b]) => {
        const channel = (value) => {
          const v = value / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const body = getComputedStyle(document.body);
      const background = body.backgroundColor === "rgba(0, 0, 0, 0)" ? [255, 255, 255] : parse(body.backgroundColor);
      const contrast = (luminance(parse(body.color)) + 0.05) / (luminance(background) + 0.05);

      return {
        title: document.title,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        imagesWithoutAlt: [...document.images].filter((img) => !img.hasAttribute("alt")).length,
        // WCAG esenta i link dentro il testo: qui si controllano solo i controlli
        // veri (pulsanti e link impaginati come blocchi).
        smallTargets: [...document.querySelectorAll("a, button")]
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
            return !inline && rect.width > 0 && rect.height > 0 && rect.height < 24;
          })
          .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent ?? "").trim().slice(0, 24)}`)
          .slice(0, 6),
        contrast: Math.round(contrast * 100) / 100,
      };
    });

    console.log(`\n${path} · ${label} · ${status} · ${report.title.slice(0, 60)}`);

    if (status >= 400) fail(`stato HTTP ${status}`);
    if (report.overflow > 1) fail(`scorrimento orizzontale di ${report.overflow}px`);
    else pass("nessuno scorrimento orizzontale");
    if (report.imagesWithoutAlt > 0) fail(`${report.imagesWithoutAlt} immagini senza alt`);
    else pass("immagini con alt");
    if (report.smallTargets.length > 0)
      fail(`${report.smallTargets.length} controlli sotto i 24px: ${report.smallTargets.join(", ")}`);
    else pass("bersagli tattili adeguati");
    if (report.contrast < 3) fail(`contrasto testo/fondo ${report.contrast}:1`);
    else pass(`contrasto ${report.contrast}:1`);
  }

  await page.close();
}

await browser.close();
console.log(failures === 0 ? "\nControllo visivo superato." : `\n${failures} controllo/i falliti.`);
process.exit(failures === 0 ? 0 : 1);
