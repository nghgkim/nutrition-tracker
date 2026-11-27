import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

interface CookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  secure: boolean;
}

export const REFRESH_COOKIE = "nt_refresh";
const REFRESH_DAYS = 30;

export class ReuseDetectedError extends Error {
  constructor() { super("Refresh token reuse detected"); this.name = "ReuseDetectedError"; }
}

export class InvalidRefreshTokenError extends Error {
  constructor() { super("Invalid refresh token"); this.name = "InvalidRefreshTokenError"; }
}

/** Refresh tokens are random and stored only as hashes. */
export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_DAYS * 24 * 60 * 60,
    // Opt-in: the same image is exercised over plain HTTP on localhost by smoke.
    secure: process.env.COOKIE_SECURE === "true",
  };
}

/** Accept only local paths so the handshake cannot be used for open redirects. */
export function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function createRefreshToken(userId: string): Promise<string> {
  const raw = newRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(raw),
      expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return raw;
}

/**
 * One-time rotation with reuse detection. The atomic claim below ensures only
 * one concurrent request can consume a token; a second attempt revokes the
 * whole family (Cloud Native Data Security with OAuth — Ch.13 — p.327-328).
 */
export async function rotateRefreshToken(raw: string): Promise<{ userId: string; token: string }> {
  const tokenHash = hashRefreshToken(raw);
  const now = new Date();
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!record) throw new InvalidRefreshTokenError();
  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new ReuseDetectedError();
  }
  if (record.expiresAt <= now) throw new InvalidRefreshTokenError();

  const token = newRefreshToken();
  const rotated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: now, lastUsedAt: now },
    });
    if (claimed.count !== 1) {
      await tx.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return null;
    }
    await tx.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: hashRefreshToken(token),
        expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { userId: record.userId, token };
  });
  if (!rotated) throw new ReuseDetectedError();
  return rotated;
}

export async function revokeRefreshToken(raw: string | undefined): Promise<void> {
  if (!raw) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
