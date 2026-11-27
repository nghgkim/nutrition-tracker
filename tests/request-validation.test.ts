import { describe, it, expect } from "vitest";
import {
  parsePositiveNumber,
  parseDay,
  normalizeMealType,
  monthBounds,
  localDayKey,
} from "@/lib/request-validation";

describe("request validation helpers", () => {
  it("rejects non-finite, zero, negative and malformed quantities", () => {
    for (const bad of [-1, 0, NaN, Infinity, -Infinity, "abc", "", null, undefined, {}]) {
      expect(parsePositiveNumber(bad, { min: 0.001 })).toBeNull();
    }
    expect(parsePositiveNumber("2.5", { min: 0.001 })).toBe(2.5);
    expect(parsePositiveNumber(6, { min: 0.001, max: 5 })).toBeNull();
  });

  it("parses a date-only string as a local calendar day", () => {
    const day = parseDay("2026-11-26");
    expect(day).not.toBeNull();
    expect(day!.getFullYear()).toBe(2026);
    expect(day!.getMonth()).toBe(10);
    expect(day!.getDate()).toBe(26);
    expect(day!.getHours()).toBe(0);
    expect(localDayKey(day!)).toBe("2026-11-26");
  });

  it("rejects invalid calendar days", () => {
    for (const bad of ["2026-13-01", "2026-02-29", "2026-11-31", "garbage", null, 123]) {
      expect(parseDay(bad)).toBeNull();
    }
  });

  it("normalizes meal types and rejects unknown values", () => {
    expect(normalizeMealType("breakfast")).toBe("breakfast");
    expect(normalizeMealType("LUNCH")).toBe("lunch");
    expect(normalizeMealType("  dinner  ")).toBe("dinner");
    for (const bad of ["unknown", "", null, 42]) {
      expect(normalizeMealType(bad)).toBeNull();
    }
  });

  it("builds local month bounds and rejects malformed months", () => {
    const bounds = monthBounds("2026-11");
    expect(bounds).not.toBeNull();
    expect(localDayKey(bounds!.start)).toBe("2026-11-01");
    expect(localDayKey(bounds!.end)).toBe("2026-12-01");
    expect(monthBounds("2026-13")).toBeNull();
    expect(monthBounds("nonsense")).toBeNull();
  });
});
