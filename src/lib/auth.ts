import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import { getSecret } from "@/lib/secret";

const scryptAsync = promisify(scrypt);

function jwtSecret(): Uint8Array {
  return new TextEncoder().encode(getSecret("JWT_SECRET"));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = "nt_session";
