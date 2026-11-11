export type HabitType = "yes_no" | "amount" | "rating";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type HabitFrequency =
  | { kind: "specific_days"; days: readonly Weekday[] }
  | { kind: "weekly_count"; count: number };

export interface HabitPlan {
  id: string;
  name: string;
  color: string;
  type: HabitType;
  target: number | null;
  unit: string | null;
  frequency: HabitFrequency;
  createdOn: string;
}

export type DailyLog =
  | { type: "yes_no"; completed: boolean }
  | { type: "amount"; amount: number }
  | { type: "rating"; rating: number };
