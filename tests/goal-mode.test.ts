import { describe, it, expect } from "vitest";
import { normalizeGoalMode } from "@/lib/goal-mode";

describe("normalizeGoalMode", () => {
  it("maps known modes and falls back to maintain", () => {
    expect(normalizeGoalMode("lose")).toBe("lose");
    expect(normalizeGoalMode("gain")).toBe("gain");
    expect(normalizeGoalMode("maintain")).toBe("maintain");
    expect(normalizeGoalMode(null)).toBe("maintain");
    expect(normalizeGoalMode("bogus")).toBe("maintain");
  });
});
