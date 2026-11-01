import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { authSecret } from "./auth";

/**
 * La chiave dell'utente non deve stare in chiaro nel database: chi legge un dump
 * non deve poter spendere il credito di qualcun altro. AES-256-GCM con chiave
 * derivata da AUTH_SECRET, formato `iv.tag.ciphertext` in base64url.
 */
function key(): Buffer {
  return scryptSync(authSecret(), "novapage:account-secrets", 32);
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

/** Se il segreto dell'app è cambiato il testo non è più leggibile: meglio nessuna chiave. */
export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const [iv, tag, data] = payload.split(".");
  if (!iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const out = Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}
