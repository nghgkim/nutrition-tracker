/** Goal intent persisted in the DB; NULL/unknown defaults to maintain. */
export type GoalMode = "lose" | "maintain" | "gain";

export function normalizeGoalMode(value: unknown): GoalMode {
  return value === "lose" || value === "maintain" || value === "gain" ? value : "maintain";
}
