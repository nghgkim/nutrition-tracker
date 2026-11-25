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

import { parseWeight } from "@/lib/profile-values";

describe("parseWeight", () => {
  it("parses valid weights and rejects invalid ones", () => {
    expect(parseWeight("70.5")).toBe(70.5);
    expect(parseWeight("0")).toBeNull();
    expect(parseWeight("-3")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
  });
});
