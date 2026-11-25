import { describe, it, expect } from "vitest";
import { toNullableNumber } from "@/lib/profile-values";

describe("toNullableNumber", () => {
  it("returns null for empty/null/undefined/invalid values", () => {
    expect(toNullableNumber(null)).toBeNull();
    expect(toNullableNumber(undefined)).toBeNull();
    expect(toNullableNumber("")).toBeNull();
    expect(toNullableNumber("abc")).toBeNull();
  });
  it("keeps real numbers and numeric strings", () => {
    expect(toNullableNumber(170)).toBe(170);
    expect(toNullableNumber("65.5")).toBe(65.5);
  });
});
