/**
 * Controlla la configurazione senza stampare nessun valore.
 *   node --env-file=.env.production.local scripts/check-env.mjs
 *   NODE_ENV=production node --env-file=.env.production.local scripts/check-env.mjs
 */
const required = [
  ["DATABASE_URL", "connessione al database Neon"],
  ["AUTH_SECRET", "firma dei cookie di sessione"],
  ["GEMINI_API_KEY", "generazione e modifica delle pagine"],
];

const recommended = [
  ["NEXT_PUBLIC_SITE_URL", "link pubblici, sitemap e link nelle email"],
  ["BLOB_READ_WRITE_TOKEN", "storage delle immagini caricate"],
  ["RESEND_API_KEY", "notifiche dei contatti e reset password"],
  ["EMAIL_FROM", "mittente delle email transazionali"],
];

const optional = ["GEMINI_MODEL", "ANALYTICS_SALT", "ALLOW_LOCAL_UPLOADS", "CLAIM_LEGACY_SITES"];

const production = process.env.NODE_ENV === "production";
const row = (state, name, note) => `${state} ${name.padEnd(24)} ${note}`;

console.log(
  `ambiente: ${process.env.NODE_ENV ?? "development"}${production ? "" : " (obbligatorie di produzione non verificate)"}`,
);

let missing = 0;

for (const [name, note] of required) {
  const ok = Boolean(process.env[name]);
  if (!ok) missing += 1;
  console.log(row(ok ? "✓" : "✗", name, ok ? note : `${note} — MANCANTE`));
}

for (const [name, note] of recommended) {
  const ok = Boolean(process.env[name]);
  if (!ok && production) missing += 1;
  console.log(row(ok ? "✓" : "!", name, ok ? note : `${note} — mancante`));
}

for (const name of optional) {
  console.log(row(process.env[name] ? "✓" : "·", name, "opzionale"));
}

const secret = process.env.AUTH_SECRET;
if (secret && secret.length < 32) {
  console.log("! AUTH_SECRET è più corta di 32 caratteri: genera con `openssl rand -hex 32`.");
}

if (missing > 0) {
  console.error(`\n${missing} variabili obbligatorie mancanti per questo ambiente.`);
  process.exit(1);
}

console.log("\nconfigurazione completa.");
