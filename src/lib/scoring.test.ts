import assert from "node:assert/strict";
import test from "node:test";
import type { HabitPlan } from "./domain";
import { scoreHabitDay, scoreLogValue, scoreWeeklyCountTotal } from "./scoring";
import { canChangeWeekSettings, canEditLogDate } from "./week";

const dailyBoolean: HabitPlan = {
  id: "boolean",
  name: "Read",
  color: "#123456",
  type: "yes_no",
  target: null,
  unit: null,
  frequency: { kind: "specific_days", days: [1, 2, 3, 4, 5, 6, 7] },
  createdOn: "2026-11-09",
};

const monday = "2026-11-09";

test("yes/no logs score 0% or 100%", () => {
  assert.equal(scoreLogValue("yes_no", null, { type: "yes_no", completed: true }), 100);
  assert.equal(scoreLogValue("yes_no", null, { type: "yes_no", completed: false }), 0);
});

test("amount logs are proportional to target and capped at 100%", () => {
  assert.equal(scoreLogValue("amount", 10, { type: "amount", amount: 5 }), 50);
  assert.equal(scoreLogValue("amount", 10, { type: "amount", amount: 15 }), 100);
});

test("rating logs map the 1–5 scale to 20–100%", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((rating) => scoreLogValue("rating", null, { type: "rating", rating })),
    [20, 40, 60, 80, 100],
  );
});

test("weekly-count contributions are weighted against the weekly goal", () => {
  const plan: HabitPlan = {
    ...dailyBoolean,
    type: "yes_no",
    frequency: { kind: "weekly_count", count: 3 },
  };
  assert.equal(scoreHabitDay(plan, monday, { type: "yes_no", completed: true }), 100 / 3);
  assert.equal(
    scoreWeeklyCountTotal(
      plan,
      monday,
      new Map([
        [monday, { type: "yes_no", completed: true }],
        ["2026-11-11", { type: "yes_no", completed: true }],
        ["2026-11-13", { type: "yes_no", completed: true }],
        ["2026-11-14", { type: "yes_no", completed: true }],
      ]),
    ),
    100,
  );
});

test("days before a habit is created are blank, not zero", () => {
  const plan = { ...dailyBoolean, createdOn: "2026-11-11" };
  assert.equal(scoreHabitDay(plan, "2026-11-10", null), null);
  assert.equal(scoreHabitDay(plan, "2026-11-11", { type: "yes_no", completed: true }), 100);
});

test("a missing scheduled-day log scores zero and a weekly-count week with no logs is no data", () => {
  assert.equal(scoreHabitDay(dailyBoolean, monday, null), 0);
  assert.equal(
    scoreWeeklyCountTotal(
      { ...dailyBoolean, frequency: { kind: "weekly_count", count: 3 } },
      monday,
      new Map(),
    ),
    null,
  );
});

test("targets are locked for the current week and editable for the next week", () => {
  const now = new Date("2026-11-11T12:00:00.000Z");
  assert.equal(canChangeWeekSettings(monday, now, "UTC"), false);
  assert.equal(canChangeWeekSettings("2026-11-16", now, "UTC"), true);
});

test("Sunday logs can be fixed through Monday local time, but not Tuesday", () => {
  const sunday = "2026-11-15";
  assert.equal(
    canEditLogDate(sunday, new Date("2026-11-16T18:29:00.000Z"), "Asia/Kolkata"),
    true,
  );
  assert.equal(
    canEditLogDate(sunday, new Date("2026-11-16T18:30:00.000Z"), "Asia/Kolkata"),
    false,
  );
});

test("invalid type values and amount targets are rejected", () => {
  assert.throws(
    () => scoreLogValue("amount", 0, { type: "amount", amount: 4 }),
    RangeError,
  );
  assert.throws(
    () => scoreLogValue("rating", null, { type: "rating", rating: 6 }),
    RangeError,
  );
  assert.throws(
    () => scoreLogValue("yes_no", null, { type: "rating", rating: 5 }),
    TypeError,
  );
});
