import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP secondo RFC 6238, senza dipendenze esterne: 30 secondi, 6 cifre, SHA-1.
 * È il formato che accettano Google Authenticator, 1Password, Authy e simili.
 */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(key: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter % 2 ** 32, 4);
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Segreto base32 da 160 bit: la lunghezza raccomandata per SHA-1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function otpauthUri(email: string, secret: string): string {
  const params = new URLSearchParams({
    secret,
    issuer: "NovaPage",
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  // Il nome mostrato nell'app resta leggibile: si codifica solo l'indirizzo.
  return `otpauth://totp/NovaPage:${encodeURIComponent(email)}?${params.toString()}`;
}

/**
 * Accetta anche il passo precedente e successivo: gli orologi di telefono e
 * server non sono mai perfettamente allineati, ma 90 secondi di tolleranza sono
 * il massimo che non allarga davvero la finestra di attacco.
 */
export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  const normalized = code.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(normalized)) return false;

  const key = base32Decode(secret);
  if (!key.length) return false;

  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  const candidate = Buffer.from(normalized);
  let valid = false;
  for (let offset = -1; offset <= 1; offset += 1) {
    const expected = Buffer.from(hotp(key, counter + offset));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      valid = true;
    }
  }
  return valid;
}

/** Senza 0/O e 1/I/l: un codice letto al telefono non deve diventare un errore. */
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const bytes = randomBytes(8);
    let code = "";
    for (let j = 0; j < 8; j += 1) {
      if (j === 4) code += "-";
      code += RECOVERY_ALPHABET[bytes[j] % RECOVERY_ALPHABET.length];
    }
    codes.push(code);
  }
  return codes;
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toLowerCase().replace(/[\s-]/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}
