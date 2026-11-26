import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "qa-user" })),
}));
vi.mock("@/lib/budget-alert", () => ({
  checkBudgetAlert: vi.fn(async () => null),
}));

vi.mock("@/lib/prisma", () => {
  const resolved = (value: unknown) => vi.fn(async () => value);
  const db = {
    familyMember: { findFirst: resolved({ familyId: "fam-1", role: "owner" }) },
    user: { findUnique: resolved({ personalBudget: 2_000_000 }), update: resolved({ personalBudget: 1 }) },
    family: { update: resolved({ householdBudget: 1 }), findUnique: resolved({ householdBudget: 1 }) },
    journalEntry: {
      findMany: resolved([]),
      upsert: resolved({ id: "entry-1", date: new Date("2026-11-26T10:00:00"), note: null, mood: null, energy: null, tags: null }),
    },
    foodLog: { findMany: resolved([]), create: resolved({ id: "log-1" }) },
    restaurant: { groupBy: resolved([]), findMany: resolved([]), count: resolved(0) },
    $queryRaw: resolved([]),
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const nestedModel = () => new Proxy({} as Record<string, unknown>, {
    get(model, method: string) {
      if (!(method in model)) model[method] = resolved({});
      return model[method];
    },
  });
  const proxy = new Proxy(db as Record<string, unknown>, {
    get(target, property: string) {
      if (!(property in target)) target[property] = nestedModel();
      return target[property];
    },
  });
  return { prisma: proxy };
});

import { GET as getLogs, POST as postLog } from "@/app/api/logs/route";
import { POST as postExercise } from "@/app/api/exercise/route";
import { PUT as putExerciseGoal } from "@/app/api/exercise/goal/route";
import { PUT as putGoal } from "@/app/api/goal/route";
import { PUT as putBudget } from "@/app/api/budget/route";
import { PUT as putHouseholdBudget } from "@/app/api/budget/household/route";
import { PUT as putPersonalBudget } from "@/app/api/budget/personal/route";
import { POST as postFood } from "@/app/api/foods/route";
import { POST as postExpense } from "@/app/api/expense/route";
import { POST as postWeight } from "@/app/api/weight/route";
import { PUT as putJournal } from "@/app/api/journal/route";
import { GET as getCorrelation } from "@/app/api/journal/correlation/route";
import { GET as getFinanceSummary } from "@/app/api/finance/summary/route";
import { GET as getRestaurants } from "@/app/api/restaurants/route";

const request = (path: string, method = "GET", body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const statusOf = async (handler: (req: Request) => Promise<Response>, path: string, method = "GET", body?: unknown) =>
  (await handler(request(path, method, body))).status;

describe("route handlers reject malformed input", () => {
  it("validates food logs at the route boundary", async () => {
    expect(await statusOf(postLog, "/api/logs", "POST", { foodId: "f1", quantity: "abc" })).toBe(400);
    expect(await statusOf(postLog, "/api/logs", "POST", { foodId: "f1", quantity: -2 })).toBe(400);
    expect(await statusOf(postLog, "/api/logs", "POST", { foodId: "f1", quantity: 2, mealType: "oops" })).toBe(400);
    expect(await statusOf(postLog, "/api/logs", "POST", { foodId: "f1", quantity: 2, date: "2026-13-99" })).toBe(400);
    expect(await statusOf(postLog, "/api/logs", "POST", { foodId: "f1", quantity: 2, mealType: "breakfast" })).toBe(201);
    expect(await statusOf(getLogs, "/api/logs?date=garbage")).toBe(400);
  });

  it("validates exercise and goal numbers", async () => {
    expect(await statusOf(postExercise, "/api/exercise", "POST", { type: "run", duration: "abc", calories: 100 })).toBe(400);
    expect(await statusOf(postExercise, "/api/exercise", "POST", { type: "run", duration: -3, calories: 100 })).toBe(400);
    expect(await statusOf(postExercise, "/api/exercise", "POST", { type: "run", duration: 30, calories: 100, date: "2026-02-30" })).toBe(400);
    expect(await statusOf(postExercise, "/api/exercise", "POST", { type: "run", duration: 30, calories: 100 })).toBe(201);
    expect(await statusOf(putExerciseGoal, "/api/exercise/goal", "PUT", { calories: "abc" })).toBe(400);
    expect(await statusOf(putGoal, "/api/goal", "PUT", { dailyCalories: "abc" })).toBe(400);
  });

  it("validates budget amounts", async () => {
    expect(await statusOf(putBudget, "/api/budget", "PUT", { amount: "abc" })).toBe(400);
    expect(await statusOf(putHouseholdBudget, "/api/budget/household", "PUT", { amount: "abc" })).toBe(400);
    expect(await statusOf(putPersonalBudget, "/api/budget/personal", "PUT", { amount: "abc" })).toBe(400);
  });

  it("validates food macros, expense, weight and journal dates", async () => {
    expect(await statusOf(postFood, "/api/foods", "POST", { name: "x", calories: "abc" })).toBe(400);
    expect(await statusOf(postFood, "/api/foods", "POST", { name: "x", calories: 100, protein: "abc" })).toBe(400);
    expect(await statusOf(postExpense, "/api/expense", "POST", { category: "food", amount: "abc" })).toBe(400);
    expect(await statusOf(postExpense, "/api/expense", "POST", { category: "food", amount: 10, date: "bad" })).toBe(400);
    expect(await statusOf(postWeight, "/api/weight", "POST", { weight: "abc" })).toBe(400);
    expect(await statusOf(putJournal, "/api/journal?date=bad", "PUT", { note: "x" })).toBe(400);
  });

  it("validates derived endpoints without throwing on bad query input", async () => {
    expect(await statusOf(getFinanceSummary, "/api/finance/summary?month=nope")).toBe(400);
    expect(await statusOf(getCorrelation, "/api/journal/correlation?year=abc&month=99")).toBe(200);
    expect(await statusOf(getRestaurants, "/api/restaurants?lat=abc&lon=abc")).toBe(200);
  });
});
