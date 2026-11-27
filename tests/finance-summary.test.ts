import { describe, it, expect } from "vitest";
import { summarizeExpenses, type ExpenseLike } from "@/lib/finance-summary";

const expense = (id: string, amount: number, fundSource: string, day: string, category = "food"): ExpenseLike => ({
  id,
  amount,
  fundSource,
  category,
  date: new Date(`${day}T10:30:00`),
});

const options = {
  personalBudget: 2_000_000,
  householdBudget: 5_000_000,
  isOwner: true,
  hasFamily: true,
  month: "2026-11",
};

describe("finance summary aggregation", () => {
  it("does not double-count the user's own household expenses", () => {
    const mine = [expense("e1", 100_000, "household", "2026-11-02"), expense("e2", 50_000, "personal", "2026-11-03")];
    const family = [expense("e1", 100_000, "household", "2026-11-02"), expense("e3", 200_000, "household", "2026-11-04")];
    const result = summarizeExpenses(mine, family, options);

    expect(result.householdSpent).toBe(300_000);
    expect(result.personalSpent).toBe(50_000);
    expect(result.categories.find(c => c.name === "food")?.amount).toBe(350_000);
    expect(result.history.find(h => h.date === "2026-11-02")?.amount).toBe(100_000);
  });

  it("uses local calendar days for history keys", () => {
    const result = summarizeExpenses([expense("e9", 10_000, "personal", "2026-11-30")], [], options);
    expect(result.history).toEqual([{ date: "2026-11-30", amount: 10_000 }]);
  });
});
