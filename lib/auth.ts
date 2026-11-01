import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { findUserById, type User } from "./store";

export const SESSION_COOKIE = "np_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;

  // In produzione il filesystem è read-only: niente fallback silenzioso su disco.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET non configurata: impostala nelle variabili d'ambiente (openssl rand -hex 32).",
    );
  }

  const file = path.join(process.cwd(), "data", "auth-secret");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  const generated = randomBytes(32).toString("hex");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, generated, { mode: 0o600 });
  return generated;
}

/**
 * scrypt asincrono: la versione sincrona blocca l'event loop per ~300 ms a ogni
 * login, registrazione o reset, serializzando le altre richieste dell'istanza.
 */
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
): Promise<{ salt: string; hash: string }> {
  const key = await derive(password, salt);
  return { salt, hash: key.toString("hex") };
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const candidate = await derive(password, salt);
  // L'hash è salvato in esadecimale: va decodificato, altrimenti si confrontano
  // 64 byte di chiave con 128 byte di testo e la verifica fallisce sempre.
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Il token porta la versione di sessione: cambiare password invalida i cookie già emessi. */
export function createSessionToken(userId: string, sessionVersion = 0): string {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expires}.${sessionVersion}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(
  token: string | undefined,
): { userId: string; sessionVersion: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, expires, version, signature] = parts;
  const payload = `${userId}.${expires}.${version}`;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  if (Number(expires) < Date.now()) return null;
  return { userId, sessionVersion: Number(version) || 0 };
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const session = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user) return null;
  if (user.sessionVersion !== session.sessionVersion) return null;
  return user;
}

export const sessionCookieOptions = {
  name: SESSION_COOKIE,
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
