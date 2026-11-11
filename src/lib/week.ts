import type { Weekday } from "./domain";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertDate(date: string): void {
  if (
    !DATE_PATTERN.test(date) ||
    new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(`Invalid calendar date: ${date}`);
  }
}

export function localDateAt(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: "year" | "month" | "day") => parts.find((value) => value.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) {
    throw new Error("Could not determine the local calendar date.");
  }
  return `${year}-${month}-${day}`;
}

export function weekdayForDate(date: string): Weekday {
  assertDate(date);
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return (day === 0 ? 7 : day) as Weekday;
}

export function addCalendarDays(date: string, days: number): string {
  assertDate(date);
  if (!Number.isInteger(days)) {
    throw new RangeError("Calendar day offsets must be integers.");
  }
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function mondayOf(date: string): string {
  return addCalendarDays(date, 1 - weekdayForDate(date));
}

export function isMonday(date: string): boolean {
  return weekdayForDate(date) === 1;
}

export function canChangeWeekSettings(
  weekStart: string,
  now: Date,
  timeZone: string,
): boolean {
  if (!isMonday(weekStart)) {
    throw new RangeError("Week settings must start on a Monday.");
  }
  return weekStart > mondayOf(localDateAt(now, timeZone));
}

export function isWithinGraceWindow(
  weekStart: string,
  now: Date,
  timeZone: string,
): boolean {
  if (!isMonday(weekStart)) {
    throw new RangeError("Weeks must start on a Monday.");
  }
  const today = localDateAt(now, timeZone);
  return today >= weekStart && today <= addCalendarDays(weekStart, 7);
}

export function canEditLogDate(
  logDate: string,
  now: Date,
  timeZone: string,
): boolean {
  assertDate(logDate);
  const today = localDateAt(now, timeZone);
  return logDate <= today && isWithinGraceWindow(mondayOf(logDate), now, timeZone);
}
