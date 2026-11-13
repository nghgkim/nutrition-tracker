import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken } from "@/lib/auth";

describe("auth helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects malformed stored hash", async () => {
    expect(await verifyPassword("x", "notahash")).toBe(false);
  });

  it("signs and verifies a JWT", async () => {
    const token = await signToken({ userId: "u1", email: "a@b.com" });
    const payload = await verifyToken(token);
    expect(payload?.userId).toBe("u1");
    expect(payload?.email).toBe("a@b.com");
  });

  it("returns null for invalid token", async () => {
    expect(await verifyToken("garbage")).toBeNull();
  });
});
