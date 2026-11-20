import { describe, it, expect } from "vitest";
import { getSecret } from "@/lib/secret";

describe("getSecret", () => {
  it("returns the env value when present", () => {
    process.env.TEST_SECRET_FIXTURE = "abc123";
    expect(getSecret("TEST_SECRET_FIXTURE")).toBe("abc123");
  });

  it("throws clearly when the variable is missing", () => {
    delete process.env.TEST_SECRET_MISSING;
    expect(() => getSecret("TEST_SECRET_MISSING")).toThrow(/TEST_SECRET_MISSING/);
  });
});
