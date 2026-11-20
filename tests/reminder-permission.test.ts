import { describe, it, expect } from "vitest";
import { canSaveReminders } from "@/lib/reminder-permission";

describe("canSaveReminders", () => {
  it("allows saving regardless of browser notification permission", () => {
    expect(canSaveReminders("default")).toBe(true);
    expect(canSaveReminders("granted")).toBe(true);
    expect(canSaveReminders("denied")).toBe(true);
    expect(canSaveReminders(null)).toBe(true);
  });
});
