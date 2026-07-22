const test = require("node:test");
const assert = require("node:assert/strict");
const { createRecentMealsModel } = require("../../recent-meals-model.js");

const { aggregateRecentMeals } = createRecentMealsModel();
const BREAKFAST = "Caf\u00e9 da manh\u00e3";
const LUNCH = "Almo\u00e7o";

test("aggregates recent meals in day and persisted-meal order with existing rounding", () => {
  const breakfast = [{ protein: 10.4, kcal: 100.4 }, { protein: null, kcal: 49.4 }];
  const result = aggregateRecentMeals({
    dailyLogs: [
      { date: "2026-07-22", log: { [LUNCH]: [{ protein: 30.6, kcal: 500.6 }], Jantar: [] } },
      { date: "2026-07-21", log: { [BREAKFAST]: breakfast, Breakfast: [{ protein: 99, kcal: 999 }] } }
    ],
    mealKeys: [BREAKFAST, LUNCH, "Jantar"]
  });

  assert.deepEqual(result, [
    { date: "2026-07-22", meal: LUNCH, entries: [{ protein: 30.6, kcal: 500.6 }], protein: 31, kcal: 501 },
    { date: "2026-07-21", meal: BREAKFAST, entries: breakfast, protein: 10, kcal: 150 }
  ]);
  assert.equal(result.some(item => item.meal === "Breakfast"), false);
});

test("skips missing and empty meals and preserves the 30-card limit", () => {
  const dailyLogs = Array.from({ length: 16 }, (_, index) => ({
    date: `2026-07-${String(22 - index).padStart(2, "0")}`,
    log: {
      [LUNCH]: [{ protein: index, kcal: index * 10 }],
      Jantar: [{ protein: index + 1, kcal: index * 10 + 5 }],
      Outro: []
    }
  }));
  const result = aggregateRecentMeals({ dailyLogs, mealKeys: [LUNCH, "Jantar", "Outro"] });

  assert.equal(result.length, 30);
  assert.equal(result[0].date, "2026-07-22");
  assert.equal(result[0].meal, LUNCH);
  assert.equal(result[29].date, "2026-07-08");
  assert.equal(result[29].meal, "Jantar");
});

test("supports the existing explicit result limit without mutating source logs", () => {
  const source = [{ date: "2026-07-22", log: { [LUNCH]: [{ protein: 1, kcal: 2 }], Jantar: [{ protein: 3, kcal: 4 }] } }];
  const before = JSON.stringify(source);
  const result = aggregateRecentMeals({ dailyLogs: source, mealKeys: [LUNCH, "Jantar"], limit: 1 });

  assert.equal(result.length, 1);
  assert.equal(JSON.stringify(source), before);
});

test("publishes a dependency-free UMD factory", () => {
  assert.equal(typeof createRecentMealsModel, "function");
  assert.equal(typeof createRecentMealsModel().aggregateRecentMeals, "function");
});
