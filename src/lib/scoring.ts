import type { DailyLog, HabitPlan, HabitType } from "./domain";
import {
  addCalendarDays,
  assertDate,
  isMonday,
  weekdayForDate,
} from "./week";

function assertPlan(plan: HabitPlan): void {
  assertDate(plan.createdOn);

  if (plan.type === "amount") {
    if (
      plan.target === null ||
      !Number.isFinite(plan.target) ||
      plan.target <= 0 ||
      plan.unit === null ||
      plan.unit.trim().length === 0
    ) {
      throw new RangeError("Amount habits need a positive target and a unit.");
    }
  } else if (plan.target !== null || plan.unit !== null) {
    throw new RangeError("Only amount habits have a target and unit.");
  }

  if (plan.frequency.kind === "weekly_count") {
    if (!Number.isInteger(plan.frequency.count) || plan.frequency.count < 1 || plan.frequency.count > 7) {
      throw new RangeError("A weekly goal must be an integer from 1 to 7.");
    }
  } else {
    const days = new Set(plan.frequency.days);
    if (
      days.size === 0 ||
      days.size !== plan.frequency.days.length ||
      plan.frequency.days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)
    ) {
      throw new RangeError("Specific-day frequency needs unique weekdays from 1 to 7.");
    }
  }
}

export function scoreLogValue(type: HabitType, target: number | null, log: DailyLog | null): number | null {
  if (log === null) {
    return null;
  }
  if (log.type !== type) {
    throw new TypeError(`Expected a ${type} log, received ${log.type}.`);
  }

  switch (log.type) {
    case "yes_no":
      return log.completed ? 100 : 0;
    case "amount":
      if (target === null || !Number.isFinite(target) || target <= 0) {
        throw new RangeError("Amount habits need a positive daily target.");
      }
      if (!Number.isFinite(log.amount) || log.amount < 0) {
        throw new RangeError("Logged amounts must be finite and non-negative.");
      }
      return Math.min((log.amount / target) * 100, 100);
    case "rating":
      if (!Number.isInteger(log.rating) || log.rating < 1 || log.rating > 5) {
        throw new RangeError("Ratings must be an integer from 1 to 5.");
      }
      return log.rating * 20;
  }
}

export function scoreHabitDay(
  plan: HabitPlan,
  date: string,
  log: DailyLog | null,
): number | null {
  assertPlan(plan);
  assertDate(date);
  if (date < plan.createdOn) {
    return null;
  }

  if (plan.frequency.kind === "specific_days") {
    if (!plan.frequency.days.includes(weekdayForDate(date))) {
      return null;
    }
    return scoreLogValue(plan.type, plan.target, log) ?? 0;
  }

  if (log === null) {
    return null;
  }
  const rawScore = scoreLogValue(plan.type, plan.target, log);
  return rawScore === null ? null : rawScore / plan.frequency.count;
}

export function scoreWeeklyCountTotal(
  plan: HabitPlan,
  weekStart: string,
  logs: ReadonlyMap<string, DailyLog>,
): number | null {
  assertPlan(plan);
  if (plan.frequency.kind !== "weekly_count") {
    throw new TypeError("Weekly-count totals only apply to weekly-count habits.");
  }
  assertDate(weekStart);
  if (!isMonday(weekStart)) {
    throw new RangeError("Weeks must start on a Monday.");
  }

  const dates = Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));
  const eligibleDates = dates.filter((date) => date >= plan.createdOn);
  if (!eligibleDates.some((date) => logs.has(date))) {
    return null;
  }

  const contributions = eligibleDates.map((date) =>
    scoreHabitDay(plan, date, logs.get(date) ?? null),
  );
  return Math.min(
    contributions.reduce<number>((sum, contribution) => sum + (contribution ?? 0), 0),
    100,
  );
}
