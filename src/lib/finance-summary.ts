/** Pure aggregation for the finance summary endpoint. */

import { localDayKey } from "@/lib/request-validation";

export interface ExpenseLike {
  id: string;
  amount: number;
  category: string;
  fundSource: string | null;
  date: Date;
}

export interface FinanceSummaryOptions {
  personalBudget: number;
  householdBudget: number;
  isOwner: boolean;
  hasFamily: boolean;
  month: string;
}

export function summarizeExpenses(
  myLogs: ExpenseLike[],
  famLogs: ExpenseLike[],
  options: FinanceSummaryOptions,
) {
  const unique = new Map<string, ExpenseLike>();
  for (const log of [...myLogs, ...famLogs]) unique.set(log.id, log);
  const all = [...unique.values()];

  const personalSpent = myLogs
    .filter(log => log.fundSource === "personal")
    .reduce((sum, log) => sum + log.amount, 0);
  const householdSpent = famLogs
    .filter(log => log.fundSource === "household")
    .reduce((sum, log) => sum + log.amount, 0);

  const categoryTotals = new Map<string, number>();
  const dayTotals = new Map<string, number>();
  for (const log of all) {
    categoryTotals.set(log.category, (categoryTotals.get(log.category) ?? 0) + log.amount);
    const key = localDayKey(log.date);
    dayTotals.set(key, (dayTotals.get(key) ?? 0) + log.amount);
  }

  return {
    month: options.month,
    personalSpent,
    householdSpent,
    personal: { budget: options.personalBudget, spent: personalSpent },
    household: {
      budget: options.householdBudget,
      spent: householdSpent,
      isOwner: options.isOwner,
      hasFamily: options.hasFamily,
    },
    categories: [...categoryTotals]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    history: [...dayTotals]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
