// Shared domain type for NIN2026 dishes used by the weekly meal plan.
export interface Dish { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; source: string; }
