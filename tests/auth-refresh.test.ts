import { describe, it, expect, vi, beforeEach } from "vitest";

const store = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    refreshToken: store,
    $transaction: vi.fn(async (fn: (tx: { refreshToken: typeof store }) => Promise<unknown>) => fn({ refreshToken: store })),
  },
}));

import {
  hashRefreshToken,
  newRefreshToken,
  safeNextPath,
  refreshCookieOptions,
  rotateRefreshToken,
  ReuseDetectedError,
  InvalidRefreshTokenError,
} from "@/lib/refresh-token";

beforeEach(() => {
  vi.clearAllMocks();
  store.findUnique.mockResolvedValue(null);
  store.updateMany.mockResolvedValue({ count: 1 });
  store.create.mockResolvedValue({ id: "new" });
});

describe("refresh token helpers", () => {
  it("hashes tokens deterministically without storing the raw value", () => {
    const raw = newRefreshToken();
    expect(hashRefreshToken(raw)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRefreshToken(raw)).toBe(hashRefreshToken(raw));
    expect(hashRefreshToken(raw)).not.toBe(hashRefreshToken("other-token"));
  });

  it("generates a fresh high-entropy token each time", () => {
    const a = newRefreshToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(newRefreshToken());
  });

  it("only allows local redirect paths", () => {
    expect(safeNextPath("/foods?q=1")).toBe("/foods?q=1");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });

  it("uses a scoped httpOnly refresh cookie with a 30-day lifetime", () => {
    expect(refreshCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60,
    });
  });
});

describe("rotateRefreshToken", () => {
  const record = {
    id: "old",
    userId: "user-1",
    tokenHash: "hash",
    createdAt: new Date("2026-11-01"),
    expiresAt: new Date("2026-12-27"),
    revokedAt: null,
    lastUsedAt: null,
  };

  it("claims the old token and issues one replacement", async () => {
    store.findUnique.mockResolvedValue({ ...record });
    const out = await rotateRefreshToken("raw-token");
    expect(out.userId).toBe("user-1");
    expect(store.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "old", revokedAt: null }) })
    );
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1" }) })
    );
  });

  it("revokes every token when a revoked token is replayed", async () => {
    store.findUnique.mockResolvedValue({ ...record, revokedAt: new Date("2026-11-27") });
    store.updateMany.mockResolvedValue({ count: 3 });
    await expect(rotateRefreshToken("raw-token")).rejects.toBeInstanceOf(ReuseDetectedError);
    expect(store.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1", revokedAt: null }) })
    );
    expect(store.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    await expect(rotateRefreshToken("unknown")).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(store.create).not.toHaveBeenCalled();
  });
});
