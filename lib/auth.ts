import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = Buffer.from(scryptSync(password, salt, 64).toString("hex"));
  const expected = Buffer.from(hash);
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
